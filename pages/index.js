import { useState, useEffect } from "react";
import { supabase } from "../supabase";

const C = {
  green:    "#1a6b3c",
  greenBg:  "#f0f7f3",
  greenPale:"#e3f2ea",
  red:      "#c0392b",
  redBg:    "#fdf2f1",
  amber:    "#b45309",
  amberBg:  "#fef9ee",
  gray50:   "#f9f8f6",
  gray100:  "#f0ede8",
  gray200:  "#e2ddd6",
  gray400:  "#a09890",
  gray600:  "#6b6460",
  gray800:  "#2c2724",
  white:    "#ffffff",
  gold:     "#c9a227",
  goldBg:   "#fdf8ec",
};

const PAYOUTS       = [100,90,75,60,50,40,30,20,10,0,-10,-20,-40,-50,-60,-75,-90,-100];
const BONUS_PER     = 6;
const TOTAL_MEMBERS = 18;
const BONUS_TOTAL   = BONUS_PER * (TOTAL_MEMBERS - 1);
const PICK_WINDOW_HOURS = 1.5;
const fmtScore  = v => { if (v===null||v===undefined) return "—"; if (v===0) return "E"; return v>0?`+${v}`:`${v}`; };
const fmtMoney  = v => { if (v===0) return "$0"; return v>0?`+$${v}`:`-$${Math.abs(v)}`; };
const scoreColor= v => { if (v===null||v===undefined) return C.gray400; if (v<0) return C.green; if (v>0) return C.red; return C.gray600; };
const moneyColor= v => v>0?C.green:v<0?C.red:C.gray600;
const rankStyle = r => {
  if (r===1) return { bg:C.goldBg,  text:C.gold,   bd:C.gold    };
  if (r===2) return { bg:C.gray100, text:C.gray600, bd:C.gray400 };
  if (r===3) return { bg:C.goldBg,  text:"#a07830", bd:"#c9a227" };
  if (r>=14) return { bg:C.redBg,   text:C.red,     bd:C.red     };
  return            { bg:C.gray100, text:C.gray600, bd:C.gray200 };
};

// ── Shared primitives ─────────────────────────────────────────────────────────
const Badge = ({ type }) => {
  const m = {
    major:     { bg:C.amberBg, text:C.amber,  lbl:"Major"     },
    signature: { bg:"#eaf4ff", text:"#1a5fa8", lbl:"Signature" },
    double:    { bg:C.greenBg, text:C.green,   lbl:"2× payout" },
  };
  const s = m[type];
  return <span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,background:s.bg,color:s.text,letterSpacing:"0.03em",textTransform:"uppercase"}}>{s.lbl}</span>;
};

const RankBadge = ({ rank }) => {
  const s = rankStyle(rank);
  return <span style={{width:26,height:26,borderRadius:"50%",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,background:s.bg,color:s.text,border:`1px solid ${s.bd}`,flexShrink:0}}>{rank}</span>;
};

const StatCard = ({ label, value, vc }) => (
  <div style={{background:C.gray50,borderRadius:10,border:`1px solid ${C.gray200}`,padding:"12px 14px"}}>
    <div style={{fontSize:11,color:C.gray400,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:5}}>{label}</div>
    <div style={{fontSize:20,fontWeight:700,color:vc||C.gray800}}>{value}</div>
  </div>
);

const NB = ({ children, type="warning" }) => {
  const m = {
    warning:{ bg:C.amberBg, text:C.amber,   bd:"#f5d87a" },
    info:   { bg:"#eaf4ff", text:"#1a5fa8", bd:"#b3d4f5" },
    success:{ bg:C.greenBg, text:C.green,   bd:"#9dd4b5" },
    neutral:{ bg:C.gray50,  text:C.gray600, bd:C.gray200 },
  };
  const s = m[type];
  return <div style={{background:s.bg,color:s.text,border:`1px solid ${s.bd}`,borderRadius:8,padding:"8px 14px",fontSize:13,marginBottom:12}}>{children}</div>;
};

const TWrap = ({ children }) => (
  <div style={{overflowX:"auto",border:`1px solid ${C.gray200}`,borderRadius:10}}>{children}</div>
);

const TH = ({ children, al="right", w }) => (
  <th style={{fontSize:11,fontWeight:700,color:C.gray400,textAlign:al,padding:"8px 9px",borderBottom:`1px solid ${C.gray200}`,background:C.gray50,whiteSpace:"nowrap",letterSpacing:"0.05em",textTransform:"uppercase",width:w}}>{children}</th>
);

const TD = ({ children, al="right", style={} }) => (
  <td style={{padding:"8px 9px",textAlign:al,verticalAlign:"middle",fontSize:13,...style}}>{children}</td>
);

const Spinner = () => (
  <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"60px 0",color:C.gray400,fontSize:14}}>
    Loading...
  </div>
);

const SectionHeader = ({ children }) => (
  <div style={{fontSize:14,fontWeight:700,color:C.gray800,marginBottom:10,paddingBottom:8,borderBottom:`1px solid ${C.gray200}`}}>
    {children}
  </div>
);

// ── This Week ─────────────────────────────────────────────────────────────────
const WeekTab = ({ tournament, scores, picks, members }) => {
  if (!tournament) return <NB type="neutral">No active tournament this week.</NB>;
  const isMajor = tournament.type === "major";
  const mul = isMajor ? 2 : 1;

  const rows = members
    .map(member => {
      const pick  = picks.find(p => p.member_id === member.id);
      const score = pick ? scores.find(s => s.golfer_name === pick.golfer_name) : null;
      return { member, pick, score };
    })
    .filter(r => r.pick?.golfer_name)
    .sort((a,b) => {
      const posA = a.score?.position ?? 999;
      const posB = b.score?.position ?? 999;
      if (posA !== posB) return posA - posB;
      // Tiebreaker: lower score in most recent completed round wins
      const lastRound = (s) => s?.round_4 ?? s?.round_3 ?? s?.round_2 ?? s?.round_1 ?? 999;
      return lastRound(a.score) - lastRound(b.score);
    });

  const winnerBonus = tournament.winner && rows[0]?.pick?.golfer_name === tournament.winner;

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        <span style={{fontSize:18,fontWeight:700,color:C.gray800}}>{tournament.name}</span>
        <Badge type={tournament.type}/>
        {isMajor && <Badge type="double"/>}
        <span style={{fontSize:12,color:C.gray400,marginLeft:"auto"}}>{tournament.status==="active"?"Live":tournament.status}</span>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:10,marginBottom:12}}>
        <StatCard label="Players"      value={members.length}/>
        <StatCard label="Winner bonus" value={`$${BONUS_PER}/member`}/>
        <StatCard label="Top payout"   value={`+$${100*mul}`} vc={C.green}/>
        <StatCard label="Max loss"     value={`-$${100*mul}`} vc={C.red}/>
      </div>

      {winnerBonus && (
        <NB type="warning">★ Winner bonus triggered — {rows[0]?.member?.name} picked the tournament winner. All others owe $6 each (${BONUS_TOTAL} total).</NB>
      )}

      {rows.length === 0 ? (
        <NB type="neutral">No picks submitted yet for this tournament.</NB>
      ) : (
        <TWrap>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:840}}>
            <thead>
              <tr>
                <TH al="center" w={40}>Pl.</TH>
                <TH al="left"   w={86}>Player</TH>
                <TH al="left"   w={118}>Pick</TH>
                <TH w={54}>Score</TH>
                <TH w={50}>Today</TH>
                <TH w={66}>Thru</TH>
                <TH w={44}>Rd 1</TH>
                <TH w={44}>Rd 2</TH>
                <TH w={44}>Rd 3</TH>
                <TH w={44}>Rd 4</TH>
                <TH w={74}>Earnings</TH>
                <TH w={62}>Bonus</TH>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ member, pick, score }, i) => {
                const groupRank = i + 1;
                const earn  = PAYOUTS[groupRank-1] * mul;
                const bonus = groupRank===1&&winnerBonus ? BONUS_TOTAL : winnerBonus ? -BONUS_PER : 0;
                return (
                  <tr key={member.id} style={{borderBottom:i<rows.length-1?`1px solid ${C.gray100}`:"none",background:i%2===0?C.white:C.gray50}}>
                    <TD al="center"><RankBadge rank={groupRank}/></TD>
                    <TD al="left"><span style={{fontWeight:700,color:C.gray800}}>{member.name}</span></TD>
                    <TD al="left">
                      <span style={{color:C.gray600,fontSize:12}}>{pick?.golfer_name||"—"}</span>
                      {score?.status==="cut"&&<span style={{marginLeft:6,fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:20,background:C.redBg,color:C.red,border:`1px solid ${C.red}`,verticalAlign:"middle"}}>CUT</span>}
                      {score?.status==="wd"&&<span style={{marginLeft:6,fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:20,background:C.amberBg,color:C.amber,border:`1px solid ${C.amber}`,verticalAlign:"middle"}}>WD</span>}
                    </TD>
                    <TD><span style={{fontWeight:700,color:scoreColor(score?.total_score)}}>{fmtScore(score?.total_score)}</span></TD>
                    <TD><span style={{color:scoreColor(score?.today_score)}}>{fmtScore(score?.today_score)}</span></TD>
                    <TD><span style={{color:C.gray400,fontSize:12}}>{score?.thru||"—"}</span></TD>
                    {[score?.round_1,score?.round_2,score?.round_3,score?.round_4].map((rd,ri) => (
                      <TD key={ri}>
                        <span style={{fontSize:12,color:rd!=null?scoreColor(rd):C.gray200,fontWeight:rd!=null&&rd<0?700:400}}>
                          {rd!=null?fmtScore(rd):"—"}
                        </span>
                      </TD>
                    ))}
                    <TD><span style={{fontWeight:700,color:moneyColor(earn)}}>{fmtMoney(earn)}</span></TD>
                    <TD><span style={{fontWeight:700,color:bonus>0?C.gold:bonus<0?C.red:C.gray400}}>{bonus===0?"—":fmtMoney(bonus)}</span></TD>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TWrap>
      )}
      <div style={{fontSize:11,color:C.gray400,marginTop:7}}>
        {rows.length} picks in · {isMajor?"2× payouts (major) · ":""}Tiebreaker: lower final round wins
      </div>
    </div>
  );
};

// ── Season ────────────────────────────────────────────────────────────────────
const SeasonTab = ({ members }) => {
  const sorted = [...members].sort((a,b) => b.season_net - a.season_net);
  const best   = sorted[0];
  const worst  = sorted[sorted.length-1];

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        <span style={{fontSize:18,fontWeight:700,color:C.gray800}}>2025 Season</span>
        <span style={{fontSize:12,color:C.gray400,marginLeft:"auto"}}>{members.length} members</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:10,marginBottom:12}}>
        <StatCard label="Members"   value={members.length}/>
        <StatCard label="Leader"    value={best?.name||"—"}/>
        <StatCard label="Best net"  value={fmtMoney(best?.season_net||0)} vc={C.green}/>
        <StatCard label="Worst net" value={fmtMoney(worst?.season_net||0)} vc={C.red}/>
      </div>
      <NB type="info">
        Pick order this week: <strong>{worst?.name}</strong> picks 1st, <strong>{best?.name}</strong> picks last.
      </NB>
      <TWrap>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:300}}>
          <thead>
            <tr>
              <TH al="center" w={40}>Pl.</TH>
              <TH al="left"   w={160}>Member</TH>
              <TH w={100}>Net</TH>
            </tr>
          </thead>
          <tbody>
            {sorted.map((member,i) => {
              const pickNum = TOTAL_MEMBERS - i;
              return (
                <tr key={member.id} style={{borderBottom:i<sorted.length-1?`1px solid ${C.gray100}`:"none",background:i%2===0?C.white:C.gray50}}>
                  <TD al="center"><RankBadge rank={i+1}/></TD>
                  <TD al="left">
                    <div style={{display:"flex",alignItems:"center",gap:7}}>
                      <span style={{fontWeight:700,color:C.gray800}}>{member.name}</span>
                      <span style={{fontSize:11,color:C.gray400,background:C.gray100,padding:"1px 6px",borderRadius:20}}>pick #{pickNum}</span>
                    </div>
                  </TD>
                  <TD><span style={{fontWeight:700,fontSize:14,color:moneyColor(member.season_net)}}>{fmtMoney(member.season_net)}</span></TD>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TWrap>
      <div style={{fontSize:11,color:C.gray400,marginTop:7}}>
        Net = total earnings + bonuses · Pick # = this week's draft position
      </div>
    </div>
  );
};

// ── Payouts ───────────────────────────────────────────────────────────────────
const PayoutsTab = () => (
  <div>
    <div style={{fontSize:18,fontWeight:700,color:C.gray800,marginBottom:16}}>Payout structure</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
      <div>
        <div style={{fontSize:11,fontWeight:700,color:C.gray400,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:8}}>Winnings</div>
        <div style={{display:"grid",gap:5}}>
          {PAYOUTS.slice(0,10).map((amt,i) => (
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"7px 12px",background:i===0?C.goldBg:C.gray50,borderRadius:7,border:`1px solid ${i===0?"#f5d87a":C.gray200}`}}>
              <span style={{fontSize:13,color:C.gray600}}>{i+1}{i===0?"st":i===1?"nd":i===2?"rd":"th"}</span>
              <span style={{fontWeight:700,color:amt>0?C.green:C.gray400}}>{fmtMoney(amt)}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div style={{fontSize:11,fontWeight:700,color:C.gray400,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:8}}>Losses</div>
        <div style={{display:"grid",gap:5}}>
          {PAYOUTS.slice(10).map((amt,i) => (
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"7px 12px",background:i===7?C.redBg:C.gray50,borderRadius:7,border:`1px solid ${i===7?"#f5b5b5":C.gray200}`}}>
              <span style={{fontSize:13,color:C.gray600}}>{i+11}th</span>
              <span style={{fontWeight:700,color:C.red}}>{fmtMoney(amt)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
    <NB type="warning"><strong>Winner bonus</strong> — 1st-place member who also picked the tournament winner collects ${BONUS_PER} from each other member (${BONUS_TOTAL} total).</NB>
    <NB type="success"><strong>Majors (4/year)</strong> — All payouts and losses doubled. Max win +$200, max loss −$200.</NB>
    <NB type="neutral"><strong>Tiebreaker</strong> — Same total score: lower final-round score takes the higher group position.</NB>
    <NB type="info"><strong>Pick order</strong> — Each week runs worst-to-best season standings. Last place picks first, first place picks last.</NB>
  </div>
);

// ── Field Manager (paste-based, replaces odds manager) ───────────────────────
const FieldManager = ({ tournamentId, onFieldUpdated }) => {
  const [pasteText, setPasteText] = useState("");
  const [preview,   setPreview]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [savedMsg,  setSavedMsg]  = useState(false);

  useEffect(() => {
    if (!tournamentId) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("odds")
        .select("golfer_name")
        .eq("tournament_id", tournamentId)
        .order("avg_odds");
      if (data && data.length > 0) {
        const names = data.map(d => d.golfer_name);
        setPasteText(names.join("\n"));
        setPreview(names);
      } else {
        setPasteText("");
        setPreview([]);
      }
      setLoading(false);
    };
    load();
  }, [tournamentId]);

  const parsePaste = (text) => {
    return text
      .split("\n")
      .map(line =>
        line
          .trim()
          // Strip leading numbers like "1." "1)" "1 " etc
          .replace(/^\d+[.)]\s*/, "")
          .replace(/^\d+\s+/, "")
          .trim()
      )
      .filter(Boolean);
  };

  const handleTextChange = (val) => {
    setPasteText(val);
    setPreview(parsePaste(val));
  };

  const saveField = async () => {
    const names = parsePaste(pasteText);
    if (names.length === 0) return;
    setSaving(true);

    await supabase.from("odds").delete().eq("tournament_id", tournamentId);

    const upserts = names.map((name, i) => ({
      tournament_id: tournamentId,
      golfer_name:   name,
      avg_odds:      i + 1,
      display_odds:  "",
      updated_at:    new Date().toISOString(),
    }));

    await supabase.from("odds").insert(upserts);

    setSaving(false);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
    setPreview(names);
    if (onFieldUpdated) onFieldUpdated();
  };

  if (loading) return <div style={{fontSize:13,color:C.gray400,padding:"12px 0"}}>Loading field...</div>;

  return (
    <div>
      <div style={{fontSize:13,color:C.gray600,marginBottom:10}}>
        Paste the tournament field below — one name per line. The order you paste is the order members will see in their dropdown.
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div>
          <div style={{fontSize:12,fontWeight:700,color:C.gray400,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:6}}>
            Paste field here
          </div>
          <textarea
            value={pasteText}
            onChange={e => handleTextChange(e.target.value)}
            placeholder={"Scottie Scheffler\nRory McIlroy\nXander Schauffele\n..."}
            style={{
              width:"100%", height:320, fontSize:13, padding:"10px",
              border:`1px solid ${C.gray200}`, borderRadius:8,
              background:C.white, color:C.gray800,
              resize:"vertical", fontFamily:"sans-serif", lineHeight:1.6,
            }}
          />
        </div>

        <div>
          <div style={{fontSize:12,fontWeight:700,color:C.gray400,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:6}}>
            Preview — {preview.length} golfers
          </div>
          <div style={{
            height:320, overflowY:"auto",
            border:`1px solid ${C.gray200}`, borderRadius:8,
            background:C.gray50,
          }}>
            {preview.length === 0 ? (
              <div style={{padding:"20px 14px",fontSize:13,color:C.gray400}}>Names will appear here as you paste...</div>
            ) : (
              preview.map((name, i) => (
                <div key={i} style={{
                  display:"flex", alignItems:"center", gap:10,
                  padding:"5px 12px",
                  borderBottom:i<preview.length-1?`1px solid ${C.gray100}`:"none",
                  background:C.white,
                }}>
                  <span style={{fontSize:11,color:C.gray400,fontWeight:600,minWidth:22}}>{i+1}</span>
                  <span style={{fontSize:13,color:C.gray800}}>{name}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={{display:"flex",alignItems:"center",gap:10,marginTop:12}}>
        <button onClick={saveField} disabled={saving||preview.length===0}
          style={{fontSize:13,padding:"7px 20px",borderRadius:7,border:`1px solid ${C.green}`,background:C.green,color:C.white,cursor:"pointer",fontWeight:700,opacity:(saving||preview.length===0)?0.6:1}}>
          {saving ? "Saving..." : `Save field (${preview.length} golfers)`}
        </button>
        <button onClick={()=>{setPasteText("");setPreview([]);}}
          style={{fontSize:12,padding:"7px 14px",borderRadius:7,border:`1px solid ${C.gray200}`,background:C.white,color:C.gray600,cursor:"pointer"}}>
          Clear
        </button>
        {savedMsg && <span style={{fontSize:12,color:C.green,fontWeight:700}}>Field saved ✓</span>}
      </div>

      <div style={{fontSize:11,color:C.gray400,marginTop:8}}>
        Field is per-tournament and doesn't carry over. To add a golfer not in the list, go to Supabase and run:<br/>
        <code style={{background:C.gray100,padding:"1px 5px",borderRadius:4,fontSize:11}}>insert into odds (tournament_id, golfer_name, avg_odds, display_odds) values ('tournament-id', 'Player Name', 999, '');</code>
      </div>
    </div>
  );
};

// ── Admin ─────────────────────────────────────────────────────────────────────
const AdminTab = ({ members, tournaments, picks, setPicks }) => {
  const [selTourney,  setSelTourney]  = useState(null);
  const [savedMsg,    setSavedMsg]    = useState({});
  const [winner,      setWinner]      = useState("");
  const [winnerSaved, setWinnerSaved] = useState(false);
  const [eventType,   setEventType]   = useState("major");
  const [saving,      setSaving]      = useState(false);
  const [oddsData,    setOddsData]    = useState([]);
  const [activeSection, setActiveSection] = useState("picks"); // "picks" | "field"

  useEffect(() => {
    if (!selTourney && tournaments.length > 0) {
      const active = tournaments.find(t => t.status === "active") || tournaments[0];
      setSelTourney(active.id);
      setEventType(active.type);
    }
  }, [tournaments, selTourney]);

  // Load odds for current tournament
  useEffect(() => {
    if (!selTourney) return;
    const loadOdds = async () => {
      const { data } = await supabase
        .from("odds")
        .select("golfer_name, display_odds, avg_odds")
        .eq("tournament_id", selTourney)
        .order("avg_odds");
      setOddsData(data || []);
    };
    loadOdds();
  }, [selTourney]);

  const tourney      = tournaments.find(t => t.id === selTourney);
  const isHistorical = tourney?.status === "complete";
  const pickOrder    = [...members].sort((a,b) => a.season_net - b.season_net);

  const takenGolfers = new Set(
    picks.filter(p => p.tournament_id === selTourney).map(p => p.golfer_name).filter(Boolean)
  );

  const currentPickIdx = pickOrder.findIndex(m =>
    !picks.find(p => p.member_id === m.id && p.tournament_id === selTourney && p.golfer_name)
  );

  const isWindowOpen = (idx) => {
    if (!tourney?.pick_window_start) return true;
    const start = new Date(tourney.pick_window_start);
    const memberWindow = new Date(start.getTime() + idx * PICK_WINDOW_HOURS * 60 * 60 * 1000);
    return new Date() >= memberWindow;
  };

  const flash = (key) => {
    setSavedMsg(p => ({...p,[key]:true}));
    setTimeout(() => setSavedMsg(p => ({...p,[key]:false})), 2000);
  };

  const savePick = async (member, golferName) => {
    if (!golferName || saving) return;
    setSaving(true);
    const existing = picks.find(p => p.member_id === member.id && p.tournament_id === selTourney);
    if (existing) {
      const { error } = await supabase.from("picks").update({ golfer_name: golferName, updated_at: new Date().toISOString() }).eq("id", existing.id);
      if (!error) { setPicks(prev => prev.map(p => p.id === existing.id ? {...p, golfer_name: golferName} : p)); flash(member.id); }
    } else {
      const { data, error } = await supabase.from("picks").insert({ member_id: member.id, tournament_id: selTourney, golfer_name: golferName, pick_order: pickOrder.indexOf(member)+1 }).select().single();
      if (!error && data) { setPicks(prev => [...prev, data]); flash(member.id); }
    }
    setSaving(false);
  };

  const handleSetWinner = async () => {
    if (!winner.trim()||!selTourney) return;
    const { error } = await supabase.from("tournaments").update({ winner: winner.trim() }).eq("id", selTourney);
    if (!error) { setWinnerSaved(true); setTimeout(()=>setWinnerSaved(false),3000); }
  };

  const handleOddsUpdated = async () => {
    const { data } = await supabase
      .from("odds")
      .select("golfer_name, display_odds, avg_odds")
      .eq("tournament_id", selTourney)
      .order("avg_odds");
    setOddsData(data || []);
  };

  if (!tourney) return <Spinner/>;

  return (
    <div>
      {/* Tournament selector */}
      <div style={{marginBottom:22}}>
        <SectionHeader>Tournament</SectionHeader>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <label style={{fontSize:13,color:C.gray600}}>Viewing:</label>
          <select value={selTourney||""} onChange={e=>{ setSelTourney(e.target.value); setOddsData([]); }}
            style={{fontSize:13,padding:"7px 10px",border:`1px solid ${C.gray200}`,borderRadius:8,background:C.white,color:C.gray800,minWidth:260,cursor:"pointer"}}>
            {tournaments.map(t=>(
              <option key={t.id} value={t.id}>{t.name} — {t.start_date}{t.status==="active"?" (current)":""}</option>
            ))}
          </select>
        </div>

        {isHistorical ? (
          <div style={{marginTop:12,padding:"10px 14px",background:C.gray50,border:`1px solid ${C.gray200}`,borderRadius:8,fontSize:13,color:C.gray600}}>
            Completed · <strong style={{color:C.gray800}}>{tourney.name}</strong>
            {tourney.winner&&<> · Winner: <strong style={{color:C.green}}>{tourney.winner}</strong></>}
          </div>
        ):(
          <div style={{marginTop:14,display:"grid",gap:10}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div>
                <label style={{fontSize:12,color:C.gray600,display:"block",marginBottom:4}}>Event type</label>
                <select value={eventType} onChange={e=>setEventType(e.target.value)}
                  style={{width:"100%",fontSize:13,padding:"7px 10px",border:`1px solid ${C.gray200}`,borderRadius:8,background:C.white,color:C.gray800}}>
                  <option value="signature">Signature event</option>
                  <option value="major">Major (2× payout)</option>
                </select>
              </div>
              <div>
                <label style={{fontSize:12,color:C.gray600,display:"block",marginBottom:4}}>Dates</label>
                <input type="text" readOnly value={`${tourney.start_date} – ${tourney.end_date}`}
                  style={{width:"100%",fontSize:13,padding:"7px 10px",border:`1px solid ${C.gray200}`,borderRadius:8,background:C.gray50,color:C.gray400}}/>
              </div>
            </div>
            <div style={{background:C.gray50,border:`1px solid ${C.gray200}`,borderRadius:8,padding:12}}>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <label style={{fontSize:12,color:C.gray600,flexShrink:0}}>Tournament winner (set when final):</label>
                <input type="text" placeholder="e.g. Scottie Scheffler" value={winner} onChange={e=>setWinner(e.target.value)}
                  style={{flex:1,minWidth:150,fontSize:13,padding:"6px 10px",border:`1px solid ${C.gray200}`,borderRadius:7,background:C.white,color:C.gray800}}/>
                <button onClick={handleSetWinner}
                  style={{fontSize:13,padding:"6px 14px",borderRadius:7,border:`1px solid ${C.gray200}`,background:C.white,color:C.gray800,cursor:"pointer",fontWeight:700}}>
                  Set winner
                </button>
                {winnerSaved&&<span style={{fontSize:11,color:C.green,fontWeight:700}}>Saved ✓</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sub-nav: Picks / Odds */}
      {!isHistorical && (
        <div style={{display:"flex",gap:2,marginBottom:16,borderBottom:`1px solid ${C.gray200}`}}>
          {["picks","field"].map(s => {
            const on = activeSection === s;
            return (
              <button key={s} onClick={() => setActiveSection(s)} style={{
                padding:"7px 16px",fontSize:13,fontWeight:on?700:400,
                cursor:"pointer",border:"none",background:"transparent",
                color:on?C.green:C.gray600,
                borderBottom:on?`2.5px solid ${C.green}`:"2.5px solid transparent",
                marginBottom:-1,borderRadius:0,textTransform:"capitalize",
              }}>{s === "picks" ? "Member picks" : "Field manager"}</button>
            );
          })}
        </div>
      )}

      {/* Odds manager section */}
      {!isHistorical && activeSection === "field" && (
        <FieldManager tournamentId={selTourney} onFieldUpdated={handleOddsUpdated} />
      )}

      {/* Member picks section */}
      {(isHistorical || activeSection === "picks") && (
        <div>
          {!isHistorical && <SectionHeader>Member picks — {tourney.name}</SectionHeader>}
          {isHistorical && <NB type="neutral">Completed event — picks are read-only.</NB>}
          {!isHistorical && oddsData.length === 0 && (
            <NB type="warning">No field entered yet for this tournament. Go to <strong>Field manager</strong> to add golfers before picks open.</NB>
          )}
          {!isHistorical && (
            <NB type="info">Pick order: worst-to-best season standing. Windows open every 1.5 hours from Tuesday 7pm PST.</NB>
          )}

          <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10}}>
            {pickOrder.map((member, idx) => {
              const pick       = picks.find(p=>p.member_id===member.id&&p.tournament_id===selTourney);
              const hasPick    = !!pick?.golfer_name;
              const windowOpen = isWindowOpen(idx);
              const isMyTurn   = !isHistorical&&idx===currentPickIdx&&windowOpen;
              const isFuture   = !isHistorical&&!windowOpen&&!hasPick;
              const isEditable = !isHistorical&&windowOpen&&!pick?.locked;
              const pickNum    = idx+1;

              return (
                <div key={member.id} style={{
                  background:C.white,
                  border:`1px solid ${isMyTurn?C.green:C.gray200}`,
                  borderRadius:8, padding:12,
                  opacity:isFuture?0.4:1,
                  outline:isMyTurn?`2px solid ${C.greenPale}`:"none",
                }}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:7}}>
                    <div style={{display:"flex",alignItems:"center",gap:7}}>
                      <span style={{fontSize:13,fontWeight:700,color:C.gray800}}>{member.name}</span>
                      <span style={{fontSize:11,color:C.gray400,background:C.gray100,padding:"1px 6px",borderRadius:20}}>pick #{pickNum}</span>
                    </div>
                    <div style={{display:"flex",gap:5}}>
                      {pick?.locked&&!isHistorical&&<span style={{fontSize:11,color:C.gray400,background:C.gray100,padding:"2px 7px",borderRadius:20,fontWeight:700}}>locked</span>}
                      {isMyTurn&&<span style={{fontSize:11,color:C.green,background:C.greenBg,padding:"2px 7px",borderRadius:20,fontWeight:700,border:`1px solid ${C.greenPale}`}}>on the clock</span>}
                      {isFuture&&<span style={{fontSize:11,color:C.gray400,background:C.gray100,padding:"2px 7px",borderRadius:20,fontWeight:700}}>waiting</span>}
                    </div>
                  </div>
                  <div style={{fontSize:12,color:C.gray600,marginBottom:isEditable?8:0}}>
                    Pick: <strong style={{color:hasPick?C.gray800:C.gray400}}>
                      {pick?.golfer_name||(isFuture?"not yet unlocked":"no pick yet")}
                    </strong>
                  </div>
                  {isEditable && (
                    <div style={{marginTop:8}}>
                      {oddsData.length === 0 ? (
                        <div style={{fontSize:12,color:C.amber,background:C.amberBg,padding:"6px 10px",borderRadius:6}}>
                          Add odds first in the Odds manager tab.
                        </div>
                      ) : (
                        <select
                          key={`${member.id}-${selTourney}`}
                          defaultValue={pick?.golfer_name||""}
                          onChange={e=>{ if(e.target.value) savePick(member, e.target.value); }}
                          style={{width:"100%",fontSize:13,padding:"7px 9px",border:`1px solid ${C.gray200}`,borderRadius:7,background:C.white,color:C.gray800,cursor:"pointer"}}
                        >
                          <option value="" disabled>Select golfer...</option>
                          {oddsData.map(g => {
                            const taken = takenGolfers.has(g.golfer_name) && pick?.golfer_name !== g.golfer_name;
                            return (
                              <option key={g.golfer_name} value={g.golfer_name} disabled={taken}
                                style={{color:taken?C.gray400:C.gray800}}>
                                {g.golfer_name}{taken?" — taken":""}
                              </option>
                            );
                          })}
                        </select>
                      )}
                      {savedMsg[member.id]&&<div style={{fontSize:11,color:C.green,marginTop:5,fontWeight:700}}>Pick saved ✓</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{fontSize:11,color:C.gray400,marginTop:10}}>
            {picks.filter(p=>p.tournament_id===selTourney&&p.golfer_name).length}/{TOTAL_MEMBERS} picks submitted · Picks lock when golfer tees off
          </div>
        </div>
      )}
    </div>
  );
};

// ── App shell ─────────────────────────────────────────────────────────────────
const TABS = [
  {id:"week",label:"This week"},{id:"season",label:"Season"},
  {id:"payouts",label:"Payout table"},{id:"admin",label:"Admin"},
];

export default function GolfPickem() {
  const [active,      setActive]      = useState("week");
  const [members,     setMembers]     = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [picks,       setPicks]       = useState([]);
  const [scores,      setScores]      = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    const load = async () => {
      const [
        {data:membersData},
        {data:tourneysData},
        {data:picksData},
        {data:scoresData},
      ] = await Promise.all([
        supabase.from("members").select("*").order("season_net",{ascending:false}),
        supabase.from("tournaments").select("*").order("start_date"),
        supabase.from("picks").select("*"),
        supabase.from("scores").select("*"),
      ]);
      setMembers(membersData||[]);
      setTournaments(tourneysData||[]);
      setPicks(picksData||[]);
      setScores(scoresData||[]);
      setLoading(false);
    };
    load();
  }, []);

  const activeTourney = tournaments.find(t=>t.status==="active");
  const activePicks   = picks.filter(p=>p.tournament_id===activeTourney?.id);
  const activeScores  = scores.filter(s=>s.tournament_id===activeTourney?.id);

  if (loading) return (
    <div style={{maxWidth:900,margin:"0 auto",padding:"60px 0",textAlign:"center",color:C.gray400,fontFamily:"sans-serif"}}>
      Loading Pick'em League...
    </div>
  );

  return (
    <div style={{maxWidth:900,margin:"0 auto",fontFamily:"'Georgia','Times New Roman',serif",color:C.gray800,padding:"0 0 40px"}}>
      <div style={{padding:"20px 0 16px",borderBottom:`1px solid ${C.gray200}`,marginBottom:20,display:"flex",alignItems:"baseline",justifyContent:"space-between"}}>
        <div>
          <div style={{fontSize:24,fontWeight:700,color:C.green,letterSpacing:"-0.5px"}}>⛳ Pick'em League</div>
          <div style={{fontSize:13,color:C.gray400,marginTop:2,fontFamily:"sans-serif"}}>2025 PGA Tour Season</div>
        </div>
        <div style={{fontSize:12,color:C.gray400,background:C.greenBg,padding:"4px 10px",borderRadius:20,fontFamily:"sans-serif",border:`1px solid ${C.greenPale}`}}>
          {members.length} members
        </div>
      </div>

      <div style={{display:"flex",gap:4,marginBottom:22,borderBottom:`1px solid ${C.gray200}`,flexWrap:"wrap"}}>
        {TABS.map(tab=>{
          const on=tab.id===active;
          return (
            <button key={tab.id} onClick={()=>setActive(tab.id)} style={{
              padding:"8px 16px",fontSize:13,fontWeight:on?700:400,fontFamily:"sans-serif",
              cursor:"pointer",border:"none",background:"transparent",
              color:on?C.green:C.gray600,
              borderBottom:on?`2.5px solid ${C.green}`:"2.5px solid transparent",
              marginBottom:-1,borderRadius:0,marginLeft:tab.id==="admin"?"auto":0,transition:"color 0.15s",
            }}>{tab.label}</button>
          );
        })}
      </div>

      <div style={{fontFamily:"sans-serif"}}>
        {active==="week"    && <WeekTab tournament={activeTourney} scores={activeScores} picks={activePicks} members={members}/>}
        {active==="season"  && <SeasonTab members={members}/>}
        {active==="payouts" && <PayoutsTab/>}
        {active==="admin"   && <AdminTab members={members} tournaments={tournaments} picks={picks} setPicks={setPicks}/>}
      </div>
    </div>
  );
}
