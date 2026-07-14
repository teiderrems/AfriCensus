const lucide = require('lucide-angular');
const keys = Object.keys(lucide.icons || lucide);
console.log("Help related:", keys.filter(k => k.toLowerCase().includes('help')));
console.log("Check related:", keys.filter(k => k.toLowerCase().includes('check')));
console.log("Dashboard related:", keys.filter(k => k.toLowerCase().includes('dash')));
console.log("Filter related:", keys.filter(k => k.toLowerCase().includes('filter')));
console.log("Circle related:", keys.filter(k => k.toLowerCase().includes('circle')));
