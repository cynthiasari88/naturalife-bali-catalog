const SUPABASE_URL="https://fvxbssqitctrdmxysiqb.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_2O8WRCv_BAhL7BEVtnTgfQ_GfGzIgFR";
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const $=s=>document.querySelector(s);
const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid=()=> "b_"+Math.random().toString(36).slice(2,10);
const defaults={
 hero:{eyebrow:"GOOD FOOD · BETTER EVERYDAY",title:"Simple choices. Feel-good living.",text:"Discover quality ingredients and thoughtfully selected food products from Naturalife Bali.",image:"",background:"#edf1e8",color:"#244b3c",padding:76,align:"left"},
 section:{title:"A section heading",text:"Add a short introduction for this section.",background:"#f8f8f3",color:"#244b3c",padding:44,align:"left"},
 columns:{leftTitle:"Naturally selected",leftText:"Thoughtfully selected ingredients for everyday living.",rightTitle:"Made for your kitchen",rightText:"Quality pantry essentials delivered across Bali.",background:"#f5f6f0",color:"#244b3c",padding:30},
 heading:{text:"Your section heading",color:"#244b3c",fontSize:34,align:"left",padding:24},
 text:{text:"Tell your customers what makes Naturalife Bali special. Share a product story, helpful information or a short introduction.",color:"#637168",fontSize:14,align:"left",padding:18},
 image:{image:"",alt:"Naturalife Bali",width:80,radius:12,align:"center",padding:20},
 button:{text:"Explore the catalog",url:"#catalog",background:"#244b3c",color:"#ffffff",align:"left",padding:22},
 features:{background:"#f5f6f0",padding:30,card1Title:"Quality ingredients",card1Text:"Thoughtfully selected food essentials.",card2Title:"Everyday goodness",card2Text:"Simple choices for your kitchen.",card3Title:"Made for Bali",card3Text:"Convenient ordering across Bali."},
 spacer:{height:60},
 "shop-link":{text:"Explore our products",url:"#catalog",background:"#244b3c",color:"#ffffff",padding:26}
};
const labels={hero:"Hero banner",section:"Section",columns:"Two columns",heading:"Heading",text:"Text",image:"Image",button:"Button",features:"Feature cards",spacer:"Spacer","shop-link":"Shop catalog link"};
let schema={version:1,blocks:[]},selectedId=null,undoStack=[],redoStack=[],session=null,dragId=null;
function snapshot(){undoStack.push(JSON.stringify(schema));if(undoStack.length>60)undoStack.shift();redoStack=[];setSaveState("Unsaved changes");}
function updateState(){renderBlocks();renderInspector();}
function block(type){return {id:uid(),type,props:structuredClone(defaults[type]||{})};}
function addBlock(type){snapshot();const b=block(type);schema.blocks.push(b);selectedId=b.id;updateState();}
function getSelected(){return schema.blocks.find(b=>b.id===selectedId)||null;}
function setSaveState(v){const el=$("#save-state");if(el)el.textContent=v;}
function renderBlock(b){
 const p=b.props||{},id=safe(b.id),style=(bg,color,pad)=>`style="background:${safe(bg||"transparent")};color:${safe(color||"#26352e")};padding:${Number(pad)||0}px"`;
 let body="";
 if(b.type==="hero")body=`<div class="block-hero" ${style(p.background,p.color,p.padding)}><div class="hero-copy"><span class="block-eyebrow">${safe(p.eyebrow)}</span><h1>${safe(p.title)}</h1><p>${safe(p.text)}</p></div>${p.image?`<img src="${safe(p.image)}" alt="">`:""}</div>`;
 else if(b.type==="section")body=`<div class="block-section" ${style(p.background,p.color,p.padding)}><h2>${safe(p.title)}</h2><p>${safe(p.text)}</p></div>`;
 else if(b.type==="columns")body=`<div class="block-columns" ${style(p.background,p.color,p.padding)}><div><h3>${safe(p.leftTitle)}</h3><p>${safe(p.leftText)}</p></div><div><h3>${safe(p.rightTitle)}</h3><p>${safe(p.rightText)}</p></div></div>`;
 else if(b.type==="heading")body=`<div class="block-heading" style="color:${safe(p.color)};font-size:${Number(p.fontSize)||34}px;text-align:${safe(p.align)};padding:${Number(p.padding)||0}px 8%"><span>${safe(p.text)}</span></div>`;
 else if(b.type==="text")body=`<div class="block-text" style="color:${safe(p.color)};font-size:${Number(p.fontSize)||14}px;text-align:${safe(p.align)};padding:${Number(p.padding)||0}px 8%"><span>${safe(p.text).replace(/\n/g,"<br>")}</span></div>`;
 else if(b.type==="image")body=p.image?`<div style="padding:${Number(p.padding)||0}px;text-align:${safe(p.align)}"><img class="block-image" style="width:${Math.min(100,Math.max(10,Number(p.width)||80))}%;border-radius:${Number(p.radius)||0}px" src="${safe(p.image)}" alt="${safe(p.alt)}"></div>`:`<div class="block-text">Add an image URL in the style panel.</div>`;
 else if(b.type==="button"||b.type==="shop-link")body=`<div class="block-button-wrap" style="text-align:${safe(p.align||"left")};padding:${Number(p.padding)||20}px 8%"><a class="block-button" style="background:${safe(p.background)};color:${safe(p.color)}" href="${safe(p.url||"#catalog")}">${safe(p.text||"Explore")}</a></div>`;
 else if(b.type==="features")body=`<div class="block-features" style="background:${safe(p.background)};padding:${Number(p.padding)||30}px 8%"><div class="feature-card"><b>${safe(p.card1Title)}</b><p>${safe(p.card1Text)}</p></div><div class="feature-card"><b>${safe(p.card2Title)}</b><p>${safe(p.card2Text)}</p></div><div class="feature-card"><b>${safe(p.card3Title)}</b><p>${safe(p.card3Text)}</p></div></div>`;
 else if(b.type==="spacer")body=`<div class="block-spacer" style="height:${Math.min(400,Math.max(8,Number(p.height)||60))}px"></div>`;
 return `<article class="canvas-block ${selectedId===b.id?"selected":""}" data-block-id="${id}" draggable="true"><div class="block-tools"><button data-move-up="${id}" title="Move up">↑</button><button data-move-down="${id}" title="Move down">↓</button><button data-remove="${id}" title="Delete">×</button></div>${body}</article>`;
}
function renderBlocks(){const el=$("#blocks-list");if(!schema.blocks.length){el.innerHTML='<div class="empty-inspector" style="padding:70px 20px"><div>＋</div><b>Your homepage starts here</b><p>Add an element from the left panel, or start with a hero banner.</p></div>';return;}el.innerHTML=schema.blocks.map(renderBlock).join("");}
function inputField(key,label,value,type="text",wide=false){const v=value??"";if(type==="textarea")return `<label>${label}<textarea data-prop="${key}">${safe(v)}</textarea></label>`;if(type==="color")return `<label>${label}<input data-prop="${key}" type="color" value="${safe(v||"#244b3c")}"></label>`;return `<label>${label}<input data-prop="${key}" type="${type}" value="${safe(v)}"></label>`;}
function selectField(key,label,value,options){return `<label>${label}<select data-prop="${key}">${options.map(o=>`<option value="${o}" ${value===o?"selected":""}>${o}</option>`).join("")}</select></label>`;}
function inspectorGroup(title,content){return `<section class="inspector-section"><h3>${title}</h3>${content}</section>`;}
function renderInspector(){
 const b=getSelected(),wrap=$("#inspector"),empty=$("#empty-inspector"),label=$("#selection-label");
 if(!b){wrap.classList.add("hidden");empty.classList.remove("hidden");label.textContent="No selection";return;}
 wrap.classList.remove("hidden");empty.classList.add("hidden");label.textContent=labels[b.type]||b.type;
 const p=b.props;let content="";
 if(["hero","section","heading","text","button","shop-link","columns","features"].includes(b.type)){
  let fields="";
  if(b.type==="hero")fields=inputField("eyebrow","Eyebrow",p.eyebrow)+inputField("title","Headline",p.title,"textarea")+inputField("text","Description",p.text,"textarea")+inputField("image","Image URL",p.image);
  if(b.type==="section")fields=inputField("title","Section heading",p.title)+inputField("text","Description",p.text,"textarea");
  if(b.type==="heading")fields=inputField("text","Heading text",p.text,"textarea");
  if(b.type==="text")fields=inputField("text","Paragraph",p.text,"textarea");
  if(b.type==="button"||b.type==="shop-link")fields=inputField("text","Button label",p.text)+inputField("url","Button link",p.url);
  if(b.type==="columns")fields=inputField("leftTitle","Left heading",p.leftTitle)+inputField("leftText","Left text",p.leftText,"textarea")+inputField("rightTitle","Right heading",p.rightTitle)+inputField("rightText","Right text",p.rightText,"textarea");
  if(b.type==="features")for(let i=1;i<=3;i++)fields+=inputField("card"+i+"Title","Card "+i+" heading",p["card"+i+"Title"])+inputField("card"+i+"Text","Card "+i+" text",p["card"+i+"Text"],"textarea");
  content+=inspectorGroup("CONTENT",fields);
 }
 if(b.type==="image")content+=inspectorGroup("IMAGE",inputField("image","Image URL",p.image)+inputField("alt","Alt text",p.alt)+inputField("width","Width (%)",p.width,"number")+inputField("radius","Corner radius (px)",p.radius,"number"));
 if(b.type==="spacer")content+=inspectorGroup("SPACING",inputField("height","Height (px)",p.height,"number"));
 if(["hero","section","features","columns"].includes(b.type))content+=inspectorGroup("BACKGROUND",inputField("background","Background color",p.background,"color")+inputField("color","Text color",p.color,"color")+inputField("padding","Inner spacing (px)",p.padding,"number"));
 if(["heading","text"].includes(b.type))content+=inspectorGroup("TYPOGRAPHY",inputField("color","Text color",p.color,"color")+inputField("fontSize","Font size (px)",p.fontSize,"number")+selectField("align","Alignment",p.align,["left","center","right"])+inputField("padding","Spacing (px)",p.padding,"number"));
 if(["button","shop-link"].includes(b.type))content+=inspectorGroup("STYLE",inputField("background","Button color",p.background,"color")+inputField("color","Text color",p.color,"color")+selectField("align","Alignment",p.align||"left",["left","center","right"])+inputField("padding","Spacing (px)",p.padding,"number"));
 if(b.type==="image")content+=inspectorGroup("LAYOUT",selectField("align","Alignment",p.align,["left","center","right"])+inputField("padding","Spacing (px)",p.padding,"number"));
 content+=`<section class="inspector-section"><button class="danger" id="delete-selected">Delete this element</button><p class="hint">Changes are saved to your draft when you select Save draft.</p></section>`;
 wrap.innerHTML=content;
}
function mutate(key,value){const b=getSelected();if(!b)return;snapshot();b.props[key]=value;renderBlocks();renderInspector();}
function moveBlock(id,delta){const i=schema.blocks.findIndex(b=>b.id===id),j=i+delta;if(i<0||j<0||j>=schema.blocks.length)return;snapshot();const [item]=schema.blocks.splice(i,1);schema.blocks.splice(j,0,item);selectedId=id;updateState();}
function removeBlock(id){snapshot();schema.blocks=schema.blocks.filter(b=>b.id!==id);selectedId=null;updateState();}
function restoreStack(from,to){if(!from.length)return;to.push(JSON.stringify(schema));schema=JSON.parse(from.pop());selectedId=schema.blocks.at(-1)?.id||null;updateState();setSaveState("Unsaved changes");}
function undo(){restoreStack(undoStack,redoStack)}function redo(){restoreStack(redoStack,undoStack)}
function setDevice(device){const c=$("#page-canvas");c.classList.toggle("mobile",device==="mobile");c.classList.toggle("desktop",device==="desktop");$("#desktop-btn").classList.toggle("active",device==="desktop");$("#mobile-btn").classList.toggle("active",device==="mobile");$("#canvas-device-label").textContent=device==="mobile"?"Mobile · 390 px":"Desktop · 1440 px";}
async function authorize(){
 const {data:{session:s}}=await db.auth.getSession();
 if(!s)return false;
 const {data,error}=await db.rpc("is_store_admin");
 if(error)throw error;if(data!==true)return false;
 session=s;return true;
}
async function enterBuilder(){const ok=await authorize();if(!ok){await db.auth.signOut();$("#login-screen").classList.remove("hidden");$("#builder-app").classList.add("hidden");return;}
 $("#login-screen").classList.add("hidden");$("#builder-app").classList.remove("hidden");
 const {data:draft,error:e1}=await db.from("store_homepage_pages").select("*").eq("slug","homepage-draft").maybeSingle();
 if(e1)throw e1;
 const {data:live,error:e2}=await db.from("store_homepage_pages").select("*").eq("slug","homepage").maybeSingle();
 if(e2)throw e2;
 schema=draft?.page_schema||live?.page_schema||{version:1,blocks:[]};if(!Array.isArray(schema.blocks))schema={version:1,blocks:[]};
 updateState();setSaveState(draft?"Draft loaded":live?"Published page loaded":"New page");
}
$("#login-form").addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.currentTarget),btn=e.currentTarget.querySelector("button");btn.disabled=true;$("#login-message").textContent="Signing in…";try{const {error}=await db.auth.signInWithPassword({email:String(f.get("email")).trim(),password:f.get("password")});if(error)throw error;await enterBuilder();if($("#builder-app").classList.contains("hidden"))throw new Error("This account is not authorized for store administration.");}catch(err){$("#login-message").textContent=err.message||"Sign-in failed.";}finally{btn.disabled=false;}});
db.auth.onAuthStateChange((_event,s)=>{if(s&&!session)setTimeout(()=>enterBuilder().catch(e=>$("#login-message").textContent=e.message),0);if(!s&&session){session=null;location.reload();}});
document.addEventListener("click",e=>{
 const add=e.target.closest("[data-add]");if(add)addBlock(add.dataset.add);
 const blockEl=e.target.closest("[data-block-id]");if(blockEl&&!e.target.closest(".block-tools")){selectedId=blockEl.dataset.blockId;renderBlocks();renderInspector();}
 const up=e.target.closest("[data-move-up]");if(up)moveBlock(up.dataset.moveUp,-1);
 const down=e.target.closest("[data-move-down]");if(down)moveBlock(down.dataset.moveDown,1);
 const del=e.target.closest("[data-remove]");if(del)removeBlock(del.dataset.remove);
 if(e.target.id==="delete-selected"&&selectedId)removeBlock(selectedId);
});
let inspectorSnapshotKey="";\n$("#inspector").addEventListener("focusin",e=>{if(e.target.dataset.prop){const key=e.target.dataset.prop;if(key!==inspectorSnapshotKey){snapshot();inspectorSnapshotKey=key;}}});\n$("#inspector").addEventListener("focusout",()=>{inspectorSnapshotKey="";});\n$("#inspector").addEventListener("input",e=>{const el=e.target;if(!el.dataset.prop)return;const b=getSelected();if(!b)return;b.props[el.dataset.prop]=el.type==="number"?Number(el.value):el.value;renderBlocks();setSaveState("Unsaved changes");});
$("#inspector").addEventListener("change",e=>{const el=e.target;if(el.dataset.prop){const b=getSelected();if(b){b.props[el.dataset.prop]=el.type==="number"?Number(el.value):el.value;setSaveState("Unsaved changes");}}});
$("#blocks-list").addEventListener("dragstart",e=>{const el=e.target.closest("[data-block-id]");if(!el)return;dragId=el.dataset.blockId;e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",dragId);});
$("#blocks-list").addEventListener("dragover",e=>{if(e.target.closest("[data-block-id]"))e.preventDefault();});
$("#blocks-list").addEventListener("drop",e=>{e.preventDefault();const target=e.target.closest("[data-block-id]");if(!target||!dragId||dragId===target.dataset.blockId)return;const from=schema.blocks.findIndex(b=>b.id===dragId),to=schema.blocks.findIndex(b=>b.id===target.dataset.blockId);if(from<0||to<0)return;snapshot();const [moved]=schema.blocks.splice(from,1);schema.blocks.splice(to,0,moved);selectedId=dragId;dragId=null;updateState();});
$("#undo-btn").onclick=undo;$("#redo-btn").onclick=redo;$("#desktop-btn").onclick=()=>setDevice("desktop");$("#mobile-btn").onclick=()=>setDevice("mobile");
$("#preview-page").textContent="Open live site ↗";$("#preview-page").onclick=()=>window.open("index.html","_blank","noopener");
async function saveRecord(slug,status){const row={slug,title:"Naturalife Bali Homepage",status,page_schema:schema,updated_at:new Date().toISOString(),published_at:status==="published"?new Date().toISOString():null};const {error}=await db.from("store_homepage_pages").upsert(row,{onConflict:"slug"});if(error)throw error;}
$("#save-draft").onclick=async()=>{const btn=$("#save-draft");btn.disabled=true;setSaveState("Saving draft…");try{await saveRecord("homepage-draft","draft");setSaveState("Draft saved");}catch(e){setSaveState("Save failed");alert(e.message);}finally{btn.disabled=false;}};
$("#publish-page").onclick=async()=>{if(!confirm("Publish this homepage layout? The current homepage layout will be replaced. Your existing catalog, cart and checkout remain unchanged."))return;const btn=$("#publish-page");btn.disabled=true;setSaveState("Publishing…");try{await saveRecord("homepage-draft","draft");await saveRecord("homepage","published");setSaveState("Published successfully");alert("Homepage published. Refresh the storefront to see the new layout.");}catch(e){setSaveState("Publish failed");alert(e.message);}finally{btn.disabled=false;}};
enterBuilder().catch(e=>{$("#login-screen").classList.remove("hidden");$("#login-message").textContent=e.message||"Could not initialize the builder.";});
