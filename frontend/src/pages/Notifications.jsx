
import { useState } from 'react';
import { Bell, Check, Trash2, Clock, Info, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { formatDistanceToNow } from 'date-fns';

const Notifications = () => {
    const { 
        notifications, 
        loading, 
        markAsRead, 
        markAllAsRead, 
        deleteNotification,
        unreadCount
    } = useNotifications();
    
    const [filter, setFilter] = useState('all'); 

    const filteredNotifications = notifications.filter(n => 
        filter === 'all' || (filter === 'unread' && n.is_read === 0)
    );

    const getTypeIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle2 className="text-emerald-500" size={18} />;
            case 'warning': return <AlertCircle className="text-amber-500" size={18} />;
            case 'error':   return <AlertCircle className="text-rose-500" size={18} />;
            default:        return <Info className="text-blue-500" size={18} />;
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
                        <Bell className="text-indigo-600" size={32} />
                        Notifications
                    </h1>
                    <p className="text-slate-500 mt-1">Manage your workflow alerts and system updates.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={markAllAsRead}
                        disabled={unreadCount === 0}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 gap-2"
                    >
                        <Check size={16} /> Mark all read
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-1 border-b pb-px">
                <button 
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 text-sm font-medium transition-all border-b-2 ${filter === 'all' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    All <span className="ml-1 opacity-60">({notifications.length})</span>
                </button>
                <button 
                    onClick={() => setFilter('unread')}
                    className={`px-4 py-2 text-sm font-medium transition-all border-b-2 ${filter === 'unread' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Unread <span className="ml-1 opacity-60">({notifications.filter(n => n.is_read === 0).length})</span>
                </button>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/50">
                            <TableHead className="w-[50px]"></TableHead>
                            <TableHead>Notification</TableHead>
                            <TableHead className="hidden md:table-cell">Details</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-48 text-center text-slate-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                                        <p>Fetching alerts...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredNotifications.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-48 text-center text-slate-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <Bell className="opacity-20" size={48} />
                                        <p>No notifications matched your filter.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredNotifications.map((n) => (
                                <TableRow 
                                    key={n.id} 
                                    className={`group transition-colors ${n.is_read === 0 ? 'bg-indigo-50/30' : ''}`}
                                >
                                    <TableCell className="text-center pl-6">
                                        {getTypeIcon(n.type)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className={`font-semibold ${n.is_read === 0 ? 'text-slate-900' : 'text-slate-600'}`}>
                                                {n.title}
                                            </span>
                                            <span className="text-xs text-slate-400 mt-0.5">
                                                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell max-w-sm">
                                        <p className="text-sm text-slate-500 truncate">{n.message}</p>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex justify-end gap-1">
                                            {n.link && (
                                                <a 
                                                    href={n.link}
                                                    className="inline-flex items-center justify-center rounded-md h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                                                    title="View"
                                                >
                                                    <ChevronRight size={18} />
                                                </a>
                                            )}
                                            {n.is_read === 0 && (
                                                <button 
                                                    onClick={() => markAsRead(n.id)}
                                                    className="inline-flex items-center justify-center rounded-md h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                                    title="Mark read"
                                                >
                                                    <Check size={18} />
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => deleteNotification(n.id)}
                                                className="inline-flex items-center justify-center rounded-md h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default Notifications;
