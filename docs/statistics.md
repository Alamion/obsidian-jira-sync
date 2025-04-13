---
jira_worklog_batch: '[]'
---

To set folder searching issue files in, redact in one of last lines `t="Jira Issues"`
To set number of weeks shown, redact in one of last lines `e=3`
```dataviewjs
var exports=(()=>{var u=Object.defineProperty;var h=Object.getOwnPropertyDescriptor;var f=Object.getOwnPropertyNames;var b=Object.prototype.hasOwnProperty;var k=(o,t)=>{for(var s in t)u(o,s,{get:t[s],enumerable:!0})},y=(o,t,s,e)=>{if(t&&typeof t=="object"||typeof t=="function")for(let i of f(t))!b.call(o,i)&&i!==s&&u(o,i,{get:()=>t[i],enumerable:!(e=h(t,i))||e.enumerable});return o};var D=o=>y(u({},"__esModule",{value:!0}),o);var T={};k(T,{TimekeepProcessor:()=>g,runTimekeep:()=>v});var g=class{constructor(t="Kanban",s=3){this.tasksDirectory=t,this.showMaxWeeks=s,this.files=app.vault.getMarkdownFiles().filter(e=>e.path.startsWith(`${this.tasksDirectory}/`)&&e.key!==null)}formatDate(t,s){let e=m=>m.toString().padStart(2,"0"),i=t.getFullYear(),r=e(t.getMonth()+1),a=e(t.getDate()),n=e(t.getHours()),c=e(t.getMinutes());return s.replace("YYYY",i.toString()).replace("MM",r).replace("DD",a).replace("HH",n).replace("mm",c)}getWeekStartDate(t){let s=new Date(t),e=s.getDay(),i=s.getDate()-e+(e===0?-6:1);return s.setDate(i),new Date(s.setHours(0,0,0,0))}formatDuration(t){let s=[{label:"w",ms:6048e5},{label:"d",ms:864e5},{label:"h",ms:36e5},{label:"m",ms:6e4},{label:"s",ms:1e3}],e=t,i=[];for(let r of s){let a=Math.floor(e/r.ms);a>0&&(i.push(`${a}${r.label}`),e%=r.ms)}return i.length>0?i.join(" "):"0s"}trimOldEntries(t,s){let e=Object.keys(t).sort();for(;e.length>s;){let i=e.shift();i&&delete t[i]}}processEntries(t,s,e,i,r){if(!(!t||!Array.isArray(t)))for(let a of t){let n=i?`${i} > ${a.name}`:a.name;if(a.startTime){let c=new Date(a.startTime),l=this.getWeekStartDate(c).toISOString().split("T")[0];r[l]||(r[l]=[]);let d,p;a.endTime?(p=new Date(a.endTime),d=this.formatDuration(p.getTime()-c.getTime())):(p=new Date,d="ongoing"),r[l].push({file:s.replace(".md",""),issueKey:e,blockPath:n,startTime:this.formatDate(c,"DD-MM-YYYY HH:mm"),endTime:a.endTime?this.formatDate(p,"DD-MM-YYYY HH:mm"):"ongoing",duration:d})}a.subEntries&&Array.isArray(a.subEntries)&&this.processEntries(a.subEntries,s,e,n,r)}}async processFiles(){let t=[];await Promise.all(this.files.map(async e=>{var c;let i=await app.vault.read(e);if(!i.includes("```timekeep"))return;let r=app.metadataCache.getFileCache(e),a=(c=r==null?void 0:r.frontmatter)==null?void 0:c.key,n=i.match(/```timekeep([\s\S]*?)```/g);n==null||n.forEach(m=>{try{let l=m.slice(11,-3).trim(),d=JSON.parse(l);t.push({file:e.name,path:e.path,issueKey:a,data:d})}catch(l){console.error(`Error in ${e.name}:`,l)}})}));let s={};if(t.forEach(e=>{this.processEntries(e.data.entries,e.file,e.issueKey,"",s)}),this.trimOldEntries(s,this.showMaxWeeks),Object.keys(s).length>0){let e=Object.keys(s).sort();for(let r of e){let a=s[r];dv.header(3,`Week of ${r}`),dv.table(["Task","Block Path","Start Time","Duration"],a.map(n=>[n.file,n.blockPath,n.startTime,n.duration]))}let i=e.map(r=>`option('${JSON.stringify(s[r])}', ${"Week of "+r})`).join(`,
`);dv.paragraph(`\`\`\`meta-bind
INPUT[inlineSelect(option('[]', 'select week'), ${i}): jira_worklog_batch]
\`\`\``),dv.paragraph(`\`\`\`meta-bind-button
label: Send worklog to Jira
hidden: false
id: ""
style: primary
actions:
  - type: command
    command: jira-sync:update-work-log-jira-batch
\`\`\``)}else dv.paragraph("No entries found.")}};function v(o="Jira Issues",t=3){new g(o,t).processFiles()}return D(T);})();

exports.runTimekeep();
```
Select a week to sent work log to Jira. Always reselect before pressing the button
