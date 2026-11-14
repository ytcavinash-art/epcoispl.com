// Local operator-only command. No web endpoint exposes enquiry records.
const fs=require('node:fs/promises'),path=require('node:path');
(async()=>{const dir=path.resolve(__dirname,'..',process.env.ENQUIRY_DATA_DIR||'.data/enquiries');let files;try{files=await fs.readdir(dir);}catch(e){if(e.code==='ENOENT'){console.log('No enquiries received yet.');return;}throw e;}
for(const f of files.filter(f=>/^[0-9a-f-]+\.json$/.test(f))){const r=JSON.parse(await fs.readFile(path.join(dir,f),'utf8'));console.log(JSON.stringify(r,null,2));}})().catch(()=>{console.error('Unable to read the private enquiry store.');process.exitCode=1;});
