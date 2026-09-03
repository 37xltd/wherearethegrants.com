const PROJECTION = "public-projections/wherearethegrants/current.json";
const SECURITY = {
  "content-security-policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
};
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const route = (v) => encodeURIComponent(String(v || "").trim());
const money = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)
    : "Not published";
};
const official = (id) => `https://www.grants.gov/search-results-detail/${route(id)}`;

function dateOnly(value) {
  const match = String(value || "").match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] || null;
}

function currentRecords(data, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  return (data?.records || []).filter((record) => {
    const close = dateOnly(record.CloseDate);
    const archive = dateOnly(record.ArchiveDate);
    // A missing deadline is retained because some live notices are open-ended.
    // Any published close/archive boundary is enforced again at request time so
    // an old R2 snapshot cannot leave an expired grant indexable.
    return (!close || close >= today) && (!archive || archive >= today);
  });
}

async function getData(env) {
  const object = await env.PUBLIC_DATA?.get(PROJECTION);
  if (!object) return null;
  const data = await object.json();
  if (data?.publicationStatus !== "approved" || data?.publicProjection !== true) return null;
  const records = currentRecords(data);
  return { ...data, records, recordCount: records.length };
}

const CSS = `*{box-sizing:border-box}body{margin:0;background:#f4f2ed;color:#17322e;font:16px/1.55 Inter,system-ui,sans-serif;overflow-wrap:anywhere}a{color:inherit}header,footer{max-width:1180px;margin:auto;padding:1.2rem 2rem;display:flex;justify-content:space-between;gap:1rem;align-items:center}.brand{font-weight:900;text-decoration:none}.brand b{display:inline-grid;place-items:center;width:2.3rem;height:2.3rem;background:#ffcb55;border-radius:.7rem;margin-right:.45rem}.brand em{color:#976310;font-style:normal}nav{display:flex;gap:1rem;flex-wrap:wrap}nav a{text-decoration:none;font-weight:750}main{max-width:1180px;margin:auto;padding:4rem 2rem 6rem}.hero{display:grid;grid-template-columns:1.3fr .7fr;gap:3rem;align-items:end}.kicker{font-size:.76rem;letter-spacing:.13em;text-transform:uppercase;font-weight:850;color:#976310}h1{font-size:clamp(3rem,7vw,6.5rem);line-height:.94;letter-spacing:-.06em;margin:.6rem 0 1.2rem}h2{font-size:clamp(1.6rem,3.5vw,2.6rem);line-height:1.05}.lead{font-size:1.2rem;max-width:760px}.stat{border-top:4px solid #ffcb55;padding-top:1rem}.stat strong{display:block;font-size:4rem;line-height:1}.search{display:flex;background:#fff;padding:.45rem;border-radius:1rem;box-shadow:0 15px 45px #17322e15;margin:2rem 0}.search input{flex:1;border:0;padding:1rem;font:inherit;min-width:0}.search button,.button{border:0;background:#ffcb55;padding:.8rem 1.1rem;border-radius:.7rem;font-weight:850;text-decoration:none}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem;margin:2rem 0 4rem;min-width:0}.card,.panel{background:#fff;padding:1.4rem;border:1px solid #17322e14;border-radius:1rem;text-decoration:none;box-shadow:0 12px 35px #17322e0c;min-width:0}.card small{display:block;text-transform:uppercase;letter-spacing:.08em;color:#765b2c}.card h2{font-size:1.3rem;margin:.4rem 0}.facts{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin:1.5rem 0}.facts div{background:#fff;padding:1.2rem;border-radius:1rem}.facts small,.facts strong{display:block}.facts strong{font-size:1.15rem}.notice{padding:1rem 1.2rem;background:#fff8dc;border-left:5px solid #ffcb55;margin:2rem 0}.crumbs{font-size:.9rem;color:#17322eaa}.actions{display:flex;gap:.8rem;flex-wrap:wrap;margin:1.5rem 0}.consent{position:fixed;left:1rem;right:1rem;bottom:1rem;max-width:900px;margin:auto;padding:1rem;background:#fff;border:1px solid #17322e33;border-radius:1rem;box-shadow:0 20px 60px #0003;display:flex;gap:1rem;align-items:center;z-index:10}.consent[hidden]{display:none}.consent span{flex:1}.consent button{border:0;border-radius:.6rem;padding:.65rem .8rem;font-weight:800}.consent [data-yes]{background:#ffcb55}footer{border-top:1px solid #17322e22;font-size:.85rem}@media(max-width:720px){header,footer{padding:1rem;align-items:flex-start;flex-direction:column}main{padding:2.5rem 1rem 4rem}.hero,.grid,.facts{grid-template-columns:minmax(0,1fr)}.search{flex-wrap:wrap}.search button{width:100%}.consent{flex-wrap:wrap}}`;
const CONSENT = `<aside class="consent" data-consent hidden><span><strong>Optional analytics</strong><br>Help us learn which public grant pages are useful. Nothing loads before you allow it.</span><button data-yes>Allow</button><button data-no>Decline</button></aside><script>(()=>{const k='wherearethegrants.analytics-consent',b=document.querySelector('[data-consent]');function load(){if(window.__ga)return;window.__ga=1;window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});gtag('consent','update',{analytics_storage:'granted'});gtag('js',new Date());gtag('config','G-SWVLQ1LFZ7',{allow_google_signals:false,allow_ad_personalization_signals:false});const s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id=G-SWVLQ1LFZ7';document.head.appendChild(s)}const c=localStorage.getItem(k);if(c==='yes')load();else if(!c)b.hidden=false;b.querySelector('[data-yes]').onclick=()=>{localStorage.setItem(k,'yes');b.hidden=true;load()};b.querySelector('[data-no]').onclick=()=>{localStorage.setItem(k,'no');b.hidden=true}})()</script>`;

const CSS2 = `body{background:#f6f2e9;color:#172033;background-image:linear-gradient(90deg,transparent 0,transparent calc(50% - 1px),#e5dfd1 calc(50% - 1px),#e5dfd1 50%,transparent 50%)}header{max-width:none;background:#172033;color:#fff;border-bottom:5px solid #ffe36e;padding:1rem max(2rem,calc((100vw - 1180px)/2))}.brand b{background:#ffe36e;color:#172033;border-radius:50%}.brand em{color:#ffe36e}main{max-width:1180px}.hero{grid-template-columns:.72fr 1.28fr;align-items:center;background:#fff;border:1px solid #d7d0c1;padding:2.5rem;margin-bottom:2rem;box-shadow:10px 10px 0 #e5ddcd}.hero h1{font-family:Georgia,serif;font-size:clamp(3rem,5.5vw,5.5rem);line-height:.9;letter-spacing:-.05em}.hero .stat{border:0;border-left:5px solid #ffe36e;background:#172033;color:#fff;padding:2rem}.search{border-radius:0;box-shadow:none;border:1px solid #cfc7b7}.search button,.button{background:#174d3d;color:#fff;border-radius:0}.grid{gap:0;border:1px solid #d7d0c1}.card,.panel{border:0;border-bottom:1px solid #d7d0c1;border-radius:0;box-shadow:none}.card:nth-child(odd){border-right:1px solid #d7d0c1}.card:hover{box-shadow:inset 5px 0 #174d3d}.facts div{border-radius:0;border:1px solid #d7d0c1}.consent{border-radius:0;border:2px solid #172033}.consent [data-yes]{background:#ffe36e}@media(max-width:720px){body{background-image:none}header nav{overflow:auto;flex-wrap:nowrap;width:100%;padding-bottom:.25rem}.hero{display:block;padding:1.4rem}.hero h1{font-size:3.2rem}.hero .stat{margin-top:1.5rem}.card:nth-child(odd){border-right:0}}`;

function shell(inner, { title = "Where Are The Grants", description = "Current US federal grant opportunities from Grants.gov.", canonical = "https://wherearethegrants.com/", noindex = false } = {}) {
  const schema = JSON.stringify({ "@context": "https://schema.org", "@type": "WebPage", name: title, description, url: canonical }).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="en-US"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(description)}">${noindex ? '<meta name="robots" content="noindex,follow">' : ""}<link rel="canonical" href="${esc(canonical)}"><script type="application/ld+json">${schema}</script><style>${CSS}${CSS2}</style></head><body><header><a class="brand" href="/"><b>W</b>Where Are <em>The Grants</em></a><nav><a href="/opportunities">Opportunities</a><a href="/agencies">Agencies</a><a href="/categories">Categories</a><a href="/sources">Sources</a></nav></header><main>${inner}</main><footer><span>Current US federal opportunities</span><span><a href="/sources">Source &amp; method</a> · <a href="https://37xventures.com/#contact">Corrections</a></span></footer>${CONSENT}</body></html>`;
}

function cards(records) {
  if (!records.length) return '<div class="notice">No current opportunity matches this view.</div>';
  return `<section class="grid">${records.map((r) => `<a class="card" href="/grant/${route(r.OpportunityID)}"><small>Closes ${esc(r.CloseDate || r.ArchiveDate || "date unavailable")}</small><h2>${esc(r.OpportunityTitle || r.OpportunityNumber)}</h2><p><strong>${esc(r.AgencyName || r.AgencyCode)}</strong></p><p>${esc(money(r.AwardFloor))}–${esc(money(r.AwardCeiling))}</p></a>`).join("")}</section>`;
}

function applicationChecklist() {
  return `<section class="panel"><h2>Before you decide to apply</h2><p>Open the official notice and confirm the eligible applicant types, place restrictions, cost-sharing rule, deadline time zone and required attachments. Check for amendments again before submission. The fields on this page help you triage a call; they do not replace the notice or establish eligibility.</p><p>If the published award range is missing, treat it as unknown—not zero. If a deadline is missing, verify whether the opportunity is genuinely open-ended. Save the opportunity number so you can find the authoritative record again.</p><p>Record a go/no-go decision with the official notice date, amendment number and the person responsible for checking the final submission.</p></section>`;
}
function home(d) {
  const agencies = new Set(d.records.map((r) => r.AgencyCode).filter(Boolean));
  return shell(`<section class="hero"><div><p class="kicker">Current US federal opportunities · dated snapshot</p><h1>Find the call. Check the source.</h1><p class="lead">Search ${d.recordCount} current Grants.gov opportunities using approved opportunity and organisation fields only.</p><form class="search" action="/opportunities"><input name="q" aria-label="Search current grants" placeholder="Topic, agency or opportunity number"><button>Search grants</button></form></div><aside class="stat"><strong>${d.recordCount}</strong><span>current opportunities · ${agencies.size} agencies · snapshot ${esc(d.sourceSnapshotDate)}</span></aside></section><section class="grid"><a class="card" href="/opportunities"><small>Browse</small><h2>Current opportunities</h2></a><a class="card" href="/agencies"><small>Browse</small><h2>Funding agencies</h2></a><a class="card" href="/categories"><small>Explore</small><h2>Funding categories</h2></a><a class="card" href="/sources"><small>Trust</small><h2>Source and limits</h2></a></section><p class="kicker">Closing next</p><h2>Nearest published deadlines</h2>${cards(d.records.slice(0, 8))}`, { title: "Current US federal grant opportunities | Where Are The Grants", description: `${d.recordCount} current Grants.gov opportunities searchable by agency, topic and opportunity number.` });
}
function grantPage(r, d) {
  const related = d.records
    .filter((candidate) => String(candidate.OpportunityID) !== String(r.OpportunityID))
    .map((candidate) => ({
      candidate,
      score: (candidate.AgencyCode && candidate.AgencyCode === r.AgencyCode ? 2 : 0)
        + (candidate.CategoryOfFundingActivity && candidate.CategoryOfFundingActivity === r.CategoryOfFundingActivity ? 1 : 0),
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || String(left.candidate.CloseDate || "9999").localeCompare(String(right.candidate.CloseDate || "9999")))
    .slice(0, 4)
    .map(({ candidate }) => candidate);
  const discovery = related.length
    ? `<p class="kicker">Keep exploring current calls</p><h2>Related opportunities from this agency or category</h2>${cards(related)}<div class="notice">These links share a published agency or funding-category code. They are not recommendations or eligibility matches.</div>`
    : "";
  return shell(`<nav class="crumbs"><a href="/">Home</a> / <a href="/opportunities">Opportunities</a> / ${esc(r.OpportunityNumber || r.OpportunityID)}</nav><p class="kicker">Current Grants.gov opportunity</p><h1>${esc(r.OpportunityTitle || r.OpportunityNumber)}</h1><p class="lead">${esc(r.AgencyName || r.AgencyCode)} · ${esc(r.OpportunityNumber || r.OpportunityID)}</p><section class="facts"><div><small>Close date</small><strong>${esc(r.CloseDate || "Not published")}</strong></div><div><small>Award range</small><strong>${esc(money(r.AwardFloor))}–${esc(money(r.AwardCeiling))}</strong></div><div><small>Expected awards</small><strong>${esc(r.ExpectedNumberOfAwards || "Not published")}</strong></div></section><section class="panel"><h2>Approved source fields</h2><p><strong>Funding instrument:</strong> ${esc(r.FundingInstrumentType || "Not published")}</p><p><strong>Funding category:</strong> ${esc(r.CategoryOfFundingActivity || "Not published")}</p><p><strong>Eligible-applicant code:</strong> ${esc(r.EligibleApplicants || "Not published")}</p><p><strong>Estimated programme funding:</strong> ${esc(money(r.EstimatedTotalProgramFunding))}</p><p><strong>Cost sharing:</strong> ${esc(r.CostSharingOrMatchingRequirement || "Not published")}</p><p><strong>Last source update:</strong> ${esc(r.LastUpdatedDate || "Not published")}</p></section><div class="actions"><a class="button" href="${official(r.OpportunityID)}" rel="external">Open official record ↗</a><a class="button" href="/agency/${route(r.AgencyCode)}">More from this agency</a></div><div class="notice">Descriptions, contacts and attachments are excluded. Verify every requirement in the official notice.</div>${applicationChecklist()}${discovery}`, { title: `${r.OpportunityTitle || r.OpportunityNumber} grant | Where Are The Grants`, description: `Dates, agency, award range and official source for ${r.OpportunityTitle || r.OpportunityNumber}.`, canonical: `https://wherearethegrants.com/grant/${route(r.OpportunityID)}` });
}
function groupPage(d, kind, id) {
  const field = kind === "agency" ? "AgencyCode" : "CategoryOfFundingActivity";
  const matches = d.records.filter((r) => String(r[field] || "") === id);
  if (!matches.length) return null;
  const name = kind === "agency" ? matches[0].AgencyName || id : `Funding category ${id}`;
  return shell(`<nav class="crumbs"><a href="/">Home</a> / <a href="/${kind === "agency" ? "agencies" : "categories"}">${kind === "agency" ? "Agencies" : "Categories"}</a> / ${esc(name)}</nav><p class="kicker">Current opportunity collection</p><h1>${esc(name)}</h1><p class="lead">${matches.length} current opportunit${matches.length === 1 ? "y" : "ies"}, ordered by published deadline.</p><div class="notice">This collection reflects the current approved Grants.gov snapshot dated ${esc(d.sourceSnapshotDate)}. It is a discovery view, not an eligibility decision. Open the official notice for applicant types, exclusions, attachments and amendments.</div>${cards(matches)}${applicationChecklist()}`, { title: `${name} current grants | Where Are The Grants`, description: `Current Grants.gov opportunities for ${name}.`, canonical: `https://wherearethegrants.com/${kind}/${route(id)}`, noindex: matches.length < 2 });
}
function directory(d, kind) {
  const field = kind === "agency" ? "AgencyCode" : "CategoryOfFundingActivity", groups = new Map();
  for (const r of d.records) if (r[field]) groups.set(r[field], { name: kind === "agency" ? r.AgencyName || r[field] : `Funding category ${r[field]}`, count: (groups.get(r[field])?.count || 0) + 1 });
  const rows = [...groups].sort((a, b) => b[1].count - a[1].count || a[1].name.localeCompare(b[1].name)), plural = kind === "agency" ? "agencies" : "categories";
  return shell(`<p class="kicker">Browse current calls</p><h1>Funding ${plural}</h1><p class="lead">Stable pages built only from current opportunities in the approved snapshot dated ${esc(d.sourceSnapshotDate)}.</p><section class="panel"><h2>How to read this directory</h2><p>Groups use the agency and funding-activity codes published in Grants.gov. Counts include only opportunities that have not passed a stated close or archive date at request time. A missing deadline is retained because some official opportunities are open-ended.</p><p>These labels organise discovery; they do not establish whether an applicant or project is eligible. Funding instruments, applicant codes, cost-sharing requirements and attachments differ by notice. Follow the official record before preparing an application, and check again for amendments close to the deadline.</p></section><section class="grid">${rows.map(([id, r]) => `<a class="card" href="/${kind}/${route(id)}"><small>${r.count} current</small><h2>${esc(r.name)}</h2></a>`).join("")}</section>`, { title: `US federal funding ${plural} | Where Are The Grants`, canonical: `https://wherearethegrants.com/${plural}` });
}
function sitemap(d) {
  const paths = ["/", "/opportunities", "/agencies", "/categories", "/sources"], agencies = new Map(), categories = new Map();
  for (const r of d.records) { paths.push(`/grant/${route(r.OpportunityID)}`); if (r.AgencyCode) agencies.set(r.AgencyCode, (agencies.get(r.AgencyCode) || 0) + 1); if (r.CategoryOfFundingActivity) categories.set(r.CategoryOfFundingActivity, (categories.get(r.CategoryOfFundingActivity) || 0) + 1); }
  for (const [id, count] of agencies) if (count >= 2) paths.push(`/agency/${route(id)}`); for (const [id, count] of categories) if (count >= 2) paths.push(`/category/${route(id)}`);
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((p) => `<url><loc>https://wherearethegrants.com${esc(p)}</loc></url>`).join("")}</urlset>`;
}

export default { async fetch(request, env) {
  const url = new URL(request.url);
  if (url.hostname === "www.wherearethegrants.com" || url.protocol !== "https:") { url.protocol = "https:"; url.hostname = "wherearethegrants.com"; return Response.redirect(url.toString(), 301); }
  if (/^\/(?:\.|wrangler\.jsonc|worker\.mjs)/i.test(url.pathname)) return new Response("Not found", { status: 404, headers: SECURITY });
  const d = await getData(env);
  if (!d) { const fallback = await env.ASSETS.fetch(request); const h = new Headers(fallback.headers); for (const [k, v] of Object.entries(SECURITY)) h.set(k, v); h.set("x-robots-tag", "noindex"); return new Response(fallback.body, { status: fallback.status, headers: h }); }
  if (url.pathname === "/sitemap.xml") return new Response(sitemap(d), { headers: { ...SECURITY, "content-type": "application/xml; charset=utf-8" } });
  if (url.pathname === "/robots.txt") return new Response("User-agent: *\nAllow: /\nSitemap: https://wherearethegrants.com/sitemap.xml\n", { headers: { ...SECURITY, "content-type": "text/plain" } });
  let body = null, noindex = false;
  if (url.pathname === "/") {
    const recheckedAt = new Date().toISOString();
    const freshness = `<p><strong>Data last collected:</strong> <time datetime="${esc(d.sourceSnapshotDate)}">${esc(d.sourceSnapshotDate)}</time> · <strong>Data last rechecked:</strong> <time datetime="${recheckedAt}">${recheckedAt}</time></p>`;
    body = home(d).replace("<main>", `<main>${freshness}`);
  }
  else if (url.pathname === "/opportunities") { const q = (url.searchParams.get("q") || "").toLowerCase().trim(); const records = d.records.filter((r) => !q || [r.OpportunityTitle, r.OpportunityNumber, r.AgencyName, r.CategoryOfFundingActivity].some((v) => String(v || "").toLowerCase().includes(q))); noindex = Boolean(q); body = shell(`<p class="kicker">Current snapshot</p><h1>${q ? `Results for “${esc(q)}”` : "Current opportunities"}</h1><form class="search"><input name="q" value="${esc(url.searchParams.get("q") || "")}"><button>Search</button></form><p class="lead">${records.length} matching current opportunit${records.length === 1 ? "y" : "ies"}.</p>${cards(records.slice(0, 500))}`, { title: "Current US federal grant opportunities | Where Are The Grants", canonical: "https://wherearethegrants.com/opportunities", noindex }); }
  else if (url.pathname === "/agencies") body = directory(d, "agency");
  else if (url.pathname === "/categories") body = directory(d, "category");
  else if (url.pathname === "/sources") body = shell(`<p class="kicker">Source and boundary</p><h1>What this site publishes</h1><section class="panel"><h2>${esc(d.sourceSnapshot)}</h2><p>${esc(d.rightsNote)}</p><p><strong>Personal-data rule:</strong> ${esc(d.personalDataPolicy)}</p><p>${esc(d.archivedRecordsExcluded)} archived or closed records are excluded.</p><p><a href="${esc(d.sourceUrl)}">Grants.gov search ↗</a> · <a href="${esc(d.licenceEvidenceUrl)}">Copyright guidance ↗</a></p></section>`, { title: "Method | Where Are The Grants", canonical: "https://wherearethegrants.com/sources" });
  else { const m = url.pathname.match(/^\/(grant|agency|category)\/([^/]+)$/); if (m) { const id = decodeURIComponent(m[2]); body = m[1] === "grant" ? (() => { const r = d.records.find((x) => String(x.OpportunityID) === id); return r ? grantPage(r, d) : null; })() : groupPage(d, m[1], id); } }
  if (!body) return new Response(shell("<h1>Not found</h1><p>No current approved record exists at this URL.</p>", { noindex: true, canonical: `https://wherearethegrants.com${url.pathname}` }), { status: 404, headers: { ...SECURITY, "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" } });
  return new Response(body, { headers: { ...SECURITY, "content-type": "text/html; charset=utf-8", ...(noindex ? { "x-robots-tag": "noindex" } : {}) } });
} };
