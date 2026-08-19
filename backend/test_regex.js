const cleansed = "(From 9am-5pm)";
const cleansed2 = "Morning /Time";
const regex1 = /^\(?[Ff]rom\s+[\d:a-zA-Z\s\-]+(?:\)|$)/i;
const regex2 = /^\(?\d+[:0-9]*[ap]m\s*-\s*\d+[:0-9]*[ap]m\)?/i;
console.log("1:", regex1.test(cleansed), regex2.test(cleansed));
console.log("2:", regex1.test(cleansed2), regex2.test(cleansed2));
