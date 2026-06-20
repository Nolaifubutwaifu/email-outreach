import { useState, useEffect } from "react";
import { Mail, Plus, Trash2, Copy, Check, ExternalLink, Users, Send, Inbox, ListChecks, Edit3, Save, Globe, Search, Loader2, AlertCircle, Instagram, Facebook } from "lucide-react";

const DEFAULT_SUBJECT = "Offer for free video shooting";
const DEFAULT_BODY = `Hi,

I hope you're doing well :)

My name is Max, and I'm a videographer based in Saint Lucia. I'm currently looking to expand my portfolio with more business-focused content and came across your business.
I was wondering if you might be interested in collaborating on a short video project. There would be no cost involved. My goal is to create a professional video that showcases your business, while also building my portfolio.

Rather than simply filming for you, I'd love to work together on the concept and create something that genuinely reflects your brand. This could include highlighting your products, services, team, atmosphere, or the story behind the business. The finished video would be available for you to use on social media, your website, and other marketing channels.

If this sounds interesting, I'd be happy to discuss some ideas and see if it's a good fit.

No pressure at all,  just let me know if you'd be open to it :) I'm also happy to chat over the phone if that's easier: +61 414 664 033.

Kind regards,
Max`;

const STATUS = {
  todo: { label: "To send", cls: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
  sent: { label: "Sent", cls: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500" },
  replied: { label: "Replied", cls: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
};

const uid = () => Math.random().toString(36).slice(2, 10);
const link = (u) => (u && (/^https?:\/\//.test(u) ? u : `https://${u}`)) || "";

export default function App() {
  const [contacts, setContacts] = useState([]);
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_BODY);
  const [loading, setLoading] = useState(true);
  const [biz, setBiz] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [bulk, setBulk] = useState("");
  const [mode, setMode] = useState("single");
  const [editTpl, setEditTpl] = useState(false);
  const [filter, setFilter] = useState("all");
  const [copied, setCopied] = useState(null);
  const [url, setUrl] = useState("");
  const [wBiz, setWBiz] = useState("");
  const [finding, setFinding] = useState(false);
  const [result, setResult] = useState(null);
  const [findErr, setFindErr] = useState("");

  useEffect(() => {
    (async () => {
      try { const c = await window.storage.get("contacts"); if (c) setContacts(JSON.parse(c.value)); } catch (e) {}
      try { const t = await window.storage.get("template"); if (t) { const p = JSON.parse(t.value); setSubject(p.subject); setBody(p.body); } } catch (e) {}
      setLoading(false);
    })();
  }, []);

  const saveContacts = async (next) => {
    setContacts(next);
    try { await window.storage.set("contacts", JSON.stringify(next)); } catch (e) {}
  };
  const saveTpl = async () => {
    try { await window.storage.set("template", JSON.stringify({ subject, body })); } catch (e) {}
    setEditTpl(false);
  };

  const add = () => {
    if (!email.trim()) return;
    saveContacts([{ id: uid(), business: biz.trim() || "(no name)", email: email.trim(), note: note.trim(), instagram: "", facebook: "", status: "todo" }, ...contacts]);
    setBiz(""); setEmail(""); setNote("");
  };

  const importBulk = () => {
    const re = /[\w.+-]+@[\w-]+\.[\w.-]+/;
    const rows = bulk.split("\n").map((l) => l.trim()).filter(Boolean).map((line) => {
      const m = line.match(re);
      if (!m) return null;
      const e = m[0];
      const name = line.replace(e, "").replace(/[<>,;|\t]+/g, " ").trim() || "(no name)";
      return { id: uid(), business: name, email: e, note: "", instagram: "", facebook: "", status: "todo" };
    }).filter(Boolean);
    if (rows.length) saveContacts([...rows, ...contacts]);
    setBulk("");
  };

  const findEmail = async () => {
    if (!url.trim()) return;
    setFinding(true); setResult(null); setFindErr("");
    const prompt = `Find the public contact details for the business at this website: ${url.trim()}${wBiz.trim() ? ` (business name: ${wBiz.trim()})` : ""}.
Check the site's contact/about/footer pages and reputable public listings. I need: the published contact email, and the business's Instagram and Facebook profile URLs if they are linked on the site.
Only return information that is genuinely published or linked — never guess or invent anything.
Respond with ONLY a JSON object, no markdown and no other text:
{"business": "<business name>", "email": "<public contact email, or empty string>", "instagram": "<full Instagram URL, or empty string>", "facebook": "<full Facebook URL, or empty string>", "found": <true or false, true if an email was found>, "note": "<short note: where found, or why none>"}`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
          tools: [{ type: "web_search_20250305", name: "web_search" }],
        }),
      });
      const data = await res.json();
      let txt = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
      txt = txt.replace(/```json|```/g, "").trim();
      const m = txt.match(/\{[\s\S]*\}/);
      const p = JSON.parse(m[0]);
      setResult({
        business: p.business || wBiz.trim() || "(no name)",
        email: p.email || "",
        instagram: p.instagram || "",
        facebook: p.facebook || "",
        note: p.note || "",
        found: !!p.found,
      });
    } catch (e) {
      setFindErr("Couldn't look that up — check the link or add the details manually.");
    }
    setFinding(false);
  };

  const addFound = () => {
    if (!result || !result.email.trim()) return;
    saveContacts([{ id: uid(), business: result.business.trim() || "(no name)", email: result.email.trim(), note: result.note.trim(), instagram: result.instagram.trim(), facebook: result.facebook.trim(), status: "todo" }, ...contacts]);
    setResult(null); setUrl(""); setWBiz("");
  };

  const setStatus = (id, status) => saveContacts(contacts.map((c) => c.id === id ? { ...c, status } : c));
  const del = (id) => saveContacts(contacts.filter((c) => c.id !== id));
  const gmailUrl = (to) => `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const copy = async (id) => { try { await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`); setCopied(id); setTimeout(() => setCopied(null), 1500); } catch (e) {} };

  const counts = {
    all: contacts.length,
    todo: contacts.filter((c) => c.status === "todo").length,
    sent: contacts.filter((c) => c.status === "sent").length,
    replied: contacts.filter((c) => c.status === "replied").length,
  };
  const shown = filter === "all" ? contacts : contacts.filter((c) => c.status === filter);

  if (loading) return <div className="p-8 text-slate-400 text-sm">Loading your list…</div>;

  const tab = (k, label) => (
    <button onClick={() => setMode(k)} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${mode === k ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}>{label}</button>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-indigo-600 text-white p-2 rounded-xl"><Mail size={22} /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Photography Outreach Manager</h1>
            <p className="text-sm text-slate-500">Draft, review, and track your free-shoot offers.</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 my-4">
          {[["all","Total",Users],["todo","To send",ListChecks],["sent","Sent",Send],["replied","Replied",Inbox]].map(([k,l,Icon]) => (
            <button key={k} onClick={() => setFilter(k)} className={`rounded-xl p-3 text-left border transition ${filter===k?"border-indigo-400 bg-white shadow-sm":"border-transparent bg-white/60 hover:bg-white"}`}>
              <Icon size={15} className="text-slate-400 mb-1" />
              <div className="text-lg font-bold text-slate-900 leading-none">{counts[k]}</div>
              <div className="text-xs text-slate-500 mt-1">{l}</div>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-sm text-slate-700">Email template</h2>
            {editTpl
              ? <button onClick={saveTpl} className="flex items-center gap-1 text-xs bg-indigo-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-indigo-700"><Save size={13} /> Save</button>
              : <button onClick={() => setEditTpl(true)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"><Edit3 size={13} /> Edit</button>}
          </div>
          <div className="text-xs text-slate-400 mb-1">Subject</div>
          {editTpl
            ? <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3" />
            : <div className="text-sm font-medium text-slate-800 mb-3 bg-slate-50 rounded-lg px-3 py-2">{subject}</div>}
          <div className="text-xs text-slate-400 mb-1">Body</div>
          {editTpl
            ? <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono leading-relaxed" />
            : <div className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2 whitespace-pre-wrap leading-relaxed max-h-44 overflow-y-auto">{body}</div>}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <div className="flex items-center gap-1.5 mb-3">
            {tab("single", "Single")}
            {tab("website", "From website")}
            {tab("bulk", "Bulk paste")}
          </div>

          {mode === "single" && (
            <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-2">
              <input value={biz} onChange={(e) => setBiz(e.target.value)} placeholder="Business name" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Email address" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <button onClick={add} className="flex items-center justify-center gap-1.5 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700"><Plus size={15} /> Add</button>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note (e.g. great fit, has socials)" className="sm:col-span-3 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          )}

          {mode === "website" && (
            <div>
              <div className="grid sm:grid-cols-[1fr_auto] gap-2">
                <div className="grid gap-2">
                  <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2">
                    <Globe size={15} className="text-slate-400 shrink-0" />
                    <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && findEmail()} placeholder="Paste website link (e.g. sunrisecafe.com.au)" className="w-full text-sm outline-none" />
                  </div>
                  <input value={wBiz} onChange={(e) => setWBiz(e.target.value)} placeholder="Business name (optional)" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <button onClick={findEmail} disabled={finding || !url.trim()} className="flex items-center justify-center gap-1.5 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 self-start">
                  {finding ? <><Loader2 size={15} className="animate-spin" /> Searching…</> : <><Search size={15} /> Find details</>}
                </button>
              </div>

              {findErr && <div className="mt-3 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2"><AlertCircle size={15} /> {findErr}</div>}

              {result && (
                <div className="mt-3 border border-slate-200 rounded-lg p-3 bg-slate-50">
                  {result.found
                    ? <div className="flex items-center gap-1.5 text-xs text-emerald-700 mb-2"><Check size={14} /> Found public details — review and add</div>
                    : <div className="flex items-center gap-1.5 text-xs text-amber-700 mb-2"><AlertCircle size={14} /> No published email found — you can type one in</div>}
                  <div className="grid sm:grid-cols-2 gap-2 mb-2">
                    <input value={result.business} onChange={(e) => setResult({ ...result, business: e.target.value })} placeholder="Business name" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                    <input value={result.email} onChange={(e) => setResult({ ...result, email: e.target.value })} placeholder="Email address" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                    <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-white">
                      <Instagram size={15} className="text-pink-500 shrink-0" />
                      <input value={result.instagram} onChange={(e) => setResult({ ...result, instagram: e.target.value })} placeholder="Instagram URL" className="w-full text-sm outline-none" />
                    </div>
                    <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-white">
                      <Facebook size={15} className="text-blue-600 shrink-0" />
                      <input value={result.facebook} onChange={(e) => setResult({ ...result, facebook: e.target.value })} placeholder="Facebook URL" className="w-full text-sm outline-none" />
                    </div>
                  </div>
                  {result.note && <div className="text-xs text-slate-500 mb-2">{result.note}</div>}
                  <div className="flex gap-2">
                    <button onClick={addFound} disabled={!result.email.trim()} className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm px-3 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"><Plus size={15} /> Add to list</button>
                    <button onClick={() => setResult(null)} className="text-sm text-slate-500 px-3 py-2 rounded-lg hover:bg-slate-100">Discard</button>
                  </div>
                </div>
              )}
              <p className="text-xs text-slate-400 mt-2">Pulls the business's own publicly listed email and social links. Always double-check before sending.</p>
            </div>
          )}

          {mode === "bulk" && (
            <div>
              <textarea value={bulk} onChange={(e) => setBulk(e.target.value)} rows={5} placeholder={"One per line, e.g.\nSunrise Cafe, hello@sunrisecafe.com\nGreen Yoga Studio, info@greenyoga.com.au"} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono" />
              <button onClick={importBulk} className="mt-2 flex items-center gap-1.5 bg-indigo-600 text-white text-sm px-3 py-2 rounded-lg hover:bg-indigo-700"><Plus size={15} /> Import list</button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {shown.length === 0 && <div className="text-center text-slate-400 text-sm py-10">No businesses here yet.</div>}
          {shown.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${STATUS[c.status].dot}`} />
                  <span className="font-medium text-slate-900 truncate">{c.business}</span>
                  {c.instagram && <a href={link(c.instagram)} target="_blank" rel="noopener noreferrer" title="Instagram" className="text-pink-500 hover:text-pink-600 shrink-0"><Instagram size={15} /></a>}
                  {c.facebook && <a href={link(c.facebook)} target="_blank" rel="noopener noreferrer" title="Facebook" className="text-blue-600 hover:text-blue-700 shrink-0"><Facebook size={15} /></a>}
                </div>
                <div className="text-sm text-slate-500 truncate">{c.email}</div>
                {c.note && <div className="text-xs text-slate-400 mt-0.5 truncate">{c.note}</div>}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select value={c.status} onChange={(e) => setStatus(c.id, e.target.value)} className={`text-xs rounded-lg px-2 py-1.5 border-0 cursor-pointer ${STATUS[c.status].cls}`}>
                  {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <button onClick={() => copy(c.id)} title="Copy email text" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">{copied === c.id ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}</button>
                <a href={gmailUrl(c.email)} target="_blank" rel="noopener noreferrer" onClick={() => c.status === "todo" && setStatus(c.id, "sent")} className="flex items-center gap-1.5 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg hover:bg-slate-700"><ExternalLink size={13} /> Open in Gmail</a>
                <button onClick={() => del(c.id)} title="Delete" className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400 mt-6 leading-relaxed">
          "Open in Gmail" opens a pre-filled compose window for you to review and send — nothing sends automatically. Your list is saved on this device.
        </p>
      </div>
    </div>
  );
}