import { exportToLegacyExcel, LC_BRAND } from '../../../utils/excelExport';

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (_) {
    return dateStr;
  }
};

/**
 * Extracts and generates an executive Legacy Clinics Excel report for Patient Refund Requests.
 * Specifically tailored for Sales Managers, Principal Cashiers, and Executive Leadership.
 */
export const exportRefundsExcelReport = async ({
  data = [],
  filters = {},
  user = null
}) => {
  const totalRefundAmount = data.reduce(
    (sum, r) => sum + (Number(r.amount_to_be_refunded) || 0),
    0
  );
  const approvedList = data.filter((r) => r.status === 'approved');
  const approvedSum = approvedList.reduce(
    (sum, r) => sum + (Number(r.amount_to_be_refunded) || 0),
    0
  );
  const verifiedList = data.filter((r) => r.status === 'verified');
  const verifiedSum = verifiedList.reduce(
    (sum, r) => sum + (Number(r.amount_to_be_refunded) || 0),
    0
  );
  const pendingList = data.filter((r) => r.status === 'pending');
  const rejectedList = data.filter((r) => r.status === 'rejected');

  const columns = [
    {
      header: 'Index #',
      key: 'index_number',
      alignment: 'center',
      width: 10,
      render: (_item, idx) => idx + 1
    },
    {
      header: 'Refund Ref',
      key: 'ref_id',
      alignment: 'center',
      width: 14,
      render: (item) => `REF-${String(item.id).padStart(4, '0')}`
    },
    {
      header: 'Refund Made',
      key: 'refund_made',
      alignment: 'left',
      width: 32,
      render: (item) => {
        const parts = [];
        if (item.service_name) parts.push(item.service_name);
        if (item.reason_for_refund) parts.push(`Reason: ${item.reason_for_refund}`);
        return parts.join(' | ') || item.service_name || item.reason_for_refund || 'Medical Service Refund';
      }
    },
    {
      header: 'Attending Provider',
      key: 'provider_name',
      alignment: 'left',
      width: 28,
      render: (item) => item.provider_name || '—'
    },
    {
      header: 'Patient',
      key: 'patient_full_name',
      alignment: 'left',
      width: 26,
      render: (item) => item.patient_full_name || '—'
    },
    {
      header: 'PID',
      key: 'pid_number',
      alignment: 'center',
      width: 16,
      render: (item) => item.pid_number || '—'
    },
    {
      header: 'Timestamp',
      key: 'created_at',
      alignment: 'center',
      width: 22,
      render: (item) => formatDateTime(item.created_at)
    },
    {
      header: 'Initiator (with Timestamp)',
      key: 'initiator_with_ts',
      alignment: 'left',
      width: 32,
      render: (item) => {
        const name = item.creator_name || 'Staff Cashier';
        const ts = formatDateTime(item.created_at);
        return `${name} (${ts})`;
      }
    },
    {
      header: 'Reviewer (with Timestamp)',
      key: 'reviewer_with_ts',
      alignment: 'left',
      width: 32,
      render: (item) => {
        if (item.verifier_name) {
          const ts = formatDateTime(item.verified_at);
          return `${item.verifier_name} (${ts})`;
        }
        if (item.status === 'pending' || item.status === 'draft') {
          return 'Pending Review';
        }
        return '—';
      }
    },
    {
      header: 'Approver (with Timestamp)',
      key: 'approver_with_ts',
      alignment: 'left',
      width: 34,
      render: (item) => {
        if (item.status === 'approved' && item.approver_name) {
          const ts = formatDateTime(item.approved_at);
          return `${item.approver_name} (${ts})`;
        }
        if (item.status === 'rejected') {
          const name = item.rejector_name || 'Management';
          const ts = formatDateTime(item.rejected_at || item.updated_at);
          return `Rejected by ${name} (${ts})`;
        }
        if (item.status === 'verified') {
          return 'Pending Final Approval';
        }
        if (item.status === 'pending') {
          return 'Pending Review & Approval';
        }
        return item.status ? item.status.toUpperCase() : '—';
      }
    },
    {
      header: 'Status',
      key: 'status',
      alignment: 'center',
      width: 16,
      isStatus: true,
      render: (item) => (item.status ? item.status.toUpperCase() : 'PENDING')
    },
    {
      header: 'Refunded Amount',
      key: 'amount_to_be_refunded',
      alignment: 'right',
      width: 24,
      isTotal: true,
      numFmt: '#,##0" RWF"',
      render: (item) => Number(item.amount_to_be_refunded) || 0
    }
  ];

  const summaryMetrics = [
    { label: 'Total Refunds Extracted', value: `${data.length.toLocaleString()} Records` },
    { label: 'Total Refunded Sum', value: `${totalRefundAmount.toLocaleString()} RWF` },
    { label: 'Approved Value', value: `${approvedSum.toLocaleString()} RWF (${approvedList.length})` },
    { label: 'In Review / Pending', value: `${(verifiedList.length + pendingList.length)} Records` }
  ];

  const metadata = [
    ['Generated By', user?.full_name || user?.username || 'Authorized Operational User'],
    ['Record Count', `${data.length.toLocaleString()} verified entries`],
    ['Status Filter', filters.status ? filters.status.toUpperCase() : 'ALL STATUSES'],
    ['Search Query', filters.patientName || filters.search || 'ALL PATIENTS'],
    ...(filters.startDate ? [['Start Date', filters.startDate]] : []),
    ...(filters.endDate ? [['End Date', filters.endDate]] : [])
  ];

  const totalRow = {
    label: 'TOTAL REFUNDED AMOUNT (RWF):',
    labelColSpan: 11, // Merge columns 1 through 11 (Provider added)
    labelAlignment: 'right',
    bgColor: LC_BRAND.LIGHT_ACCENT,
    columns: {
      amount_to_be_refunded: {
        autoSum: true,
        value: totalRefundAmount,
        numFmt: '#,##0" RWF"'
      }
    }
  };

  const statusLabel = filters.status ? `_${filters.status.toUpperCase()}` : '';
  const dateStamp = new Date().toISOString().slice(0, 10);

  await exportToLegacyExcel({
    title: 'LEGACY CLINICS KIGALI — REFUND REPORT',
    subtitle: `Finance & Cashier Audit — Total Refunded: ${totalRefundAmount.toLocaleString()} RWF across ${data.length} records`,
    filename: `Legacy_Clinics_Refund_Report${statusLabel}_${dateStamp}`,
    sheetName: 'Refunds Audit',
    columns,
    data,
    metadata,
    summaryMetrics,
    totalRow,
    includeDefaultMeta: false,
    user
  });
};
