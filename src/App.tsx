import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { boardItems, boardPrompt, challenges, recipeFor, recipes, stationFor, stations, type ChallengeId } from './content';
import { createGame, earnedChallenges, PERFECT_BONUS, PERFECT_WINDOW_MS, phase, remainingMs, ROUND_MS, transition, tutorialStep, type Action, type Game, type TutorialStep } from './game';
import { browserProgress, recordRound, saveBrowserProgress, type Progress } from './storage';
import { KitchenAudio } from './audio';
import Food from './Food';

type View = 'kitchen' | 'challenges' | 'board';
const accentStyle = (accent: string) => ({ '--accent': accent }) as CSSProperties;

const coach: Record<TutorialStep, { step: number; title: string; text: string }> = {
  select: { step: 1, title: 'Pick an order', text: 'Click any glowing order ticket. Each ticket shows which station cooks it.' },
  cook: { step: 2, title: 'Fire it up', text: 'Click the glowing station that matches your ticket to start cooking.' },
  parallel: { step: 3, title: 'Multitask like a pro', text: 'While that cooks, pick a ticket for a different station and start it too.' },
  wait: { step: 4, title: 'Watch it cook', text: 'Progress bars fill as food cooks. Click a station as soon as it says READY.' },
  serve: { step: 4, title: 'Ship it!', text: 'Something is READY. Click that station to serve it for +100 points, or +25 more if you serve within 1 second.' },
  done: { step: 5, title: 'You\u2019re ready, chef!', text: 'The real round lasts 60 seconds, and ready food burns if you wait too long. Good luck!' },
};

function copyWithTextarea(text: string): boolean {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  try { return document.execCommand('copy'); }
  catch { return false; }
  finally { area.remove(); }
}

// Copy synchronously inside the click first; the async Clipboard API can hang on permission prompts.
async function copyText(text: string): Promise<void> {
  if (copyWithTextarea(text)) return;
  if (!navigator.clipboard) throw new Error('Copy failed');
  await Promise.race([
    navigator.clipboard.writeText(text),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Copy timed out')), 1500)),
  ]);
}

function BrandMark() {
  return <span className="brand-mark" aria-hidden="true"><span /><span /><span /><span /></span>;
}

function ChallengeList({ progress, game }: { progress: Progress; game: Game | null }) {
  const earned = game ? earnedChallenges(game) : [];
  return <div className="challenge-list">{challenges.map((challenge, index) => {
    const done = progress.completed.includes(challenge.id);
    const current = earned.includes(challenge.id);
    return <article className={`challenge ${done || current ? 'complete' : ''}`} key={challenge.id}>
      <span className="challenge-icon" aria-hidden="true">{done || current ? '\u2713' : `0${index + 1}`}</span>
      <div><h3>{challenge.name}</h3><p>{challenge.description}</p>
        <small>{done ? 'Unlocked on this browser' : current ? 'Earned this round' : game && index === 0 ? `${game.served}/1 dishes` : game && index === 1 ? `${game.servedRecipes.length}/${recipes.length} recipes` : game && index === 2 ? `${game.served}/5 dishes \u00b7 ${game.burns} burns \u00b7 finish round` : 'Ready to unlock'}</small>
      </div>
    </article>;
  })}</div>;
}

export default function App() {
  const [view, setView] = useState<View>('kitchen');
  const [game, setGame] = useState<Game | null>(null);
  const gameRef = useRef<Game | null>(null);
  const [now, setNow] = useState(0);
  const [sound, setSound] = useState(false);
  const [audioWarning, setAudioWarning] = useState('');
  const [copied, setCopied] = useState<{ id: string; ok: boolean } | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saved, setSaved] = useState(browserProgress);
  const progressRef = useRef(saved.progress);
  const finalized = useRef<number | null>(null);
  const beforeRound = useRef<ChallengeId[]>([]);
  const audio = useRef(new KitchenAudio());
  const playing = game !== null && !game.ended;
  const progress = saved.progress;

  const send = useCallback((action: Action) => {
    const previous = gameRef.current;
    if (!previous) return;
    const time = performance.now();
    const next = transition(previous, action, time);
    gameRef.current = next;
    setGame(next);
    setNow(time);
    if (next.served > previous.served) audio.current.serve();
    if (next.burns > previous.burns && !next.ended) audio.current.burn();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => send({ type: 'tick' }), 50);
    return () => clearInterval(id);
  }, [playing, send]);

  useEffect(() => {
    if (!game?.ended || finalized.current === game.startedAt) return;
    finalized.current = game.startedAt;
    const next = recordRound(progressRef.current, game);
    progressRef.current = next;
    const warning = saveBrowserProgress(next);
    setSaved({ progress: next, warning });
  }, [game]);

  useEffect(() => {
    let active = true;
    if (playing && sound) {
      void audio.current.start().catch(() => {
        if (active) {
          setAudioWarning('Audio could not start. The kitchen is still playable. Try enabling sound again.');
          setSound(false);
        }
      });
    } else audio.current.stop();
    const kitchenAudio = audio.current;
    return () => { active = false; kitchenAudio.stop(); };
  }, [playing, sound]);

  useEffect(() => {
    const kitchenAudio = audio.current;
    return () => { void kitchenAudio.dispose().catch(() => console.warn('Kitchen audio could not close.')); };
  }, []);

  function start(practice = false) {
    beforeRound.current = [...progressRef.current.completed];
    const time = performance.now();
    const next = createGame(time, practice);
    gameRef.current = next;
    setGame(next);
    setNow(time);
    setView('kitchen');
  }

  function copyPrompt(id: string, text: string) {
    void copyText(text).then(() => true, () => false).then(ok => {
      setCopied({ id, ok });
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(null), 2000);
    });
  }

  function exitPractice() {
    gameRef.current = null;
    setGame(null);
  }

  const left = game ? remainingMs(game, now) : ROUND_MS;
  const seconds = Math.ceil(left / 1000);
  const selectedOrder = game?.orders.find(order => order.id === game.selected);
  const selection = selectedOrder ? recipeFor(selectedOrder.recipe) : null;
  const best = progress.scores[0] ?? 0;
  const step = game?.practice ? tutorialStep(game, now) : null;
  const roundGame = game?.practice ? null : game;

  return <div className="app">
    <header className="site-header">
      <a className="wordmark" href="#" onClick={event => { event.preventDefault(); if (!playing) setView('kitchen'); }} aria-label="Sweet Stack home"><span className="terminal-mark" aria-hidden="true">&gt;_</span> sweet<span className="wordmark-light">stack</span><span className="preview-pill">IGNITE EDITION</span></a>
      <div className="event-brand"><BrandMark /><span>Microsoft Ignite</span><span className="header-divider" /><span className="code-logo" aria-label="VS Code themed">&lt;/&gt;</span></div>
    </header>

    <main>
      <div className="breadcrumb"><span className="branch-icon" aria-hidden="true">&#9282;</span> ignite-attendees <span>/</span> <strong>sweet-stack</strong><span className="public-pill">Playable</span></div>
      <div className="page-heading"><div><p className="eyebrow"><span className="live-dot" /> THE TASTIEST SIDE QUEST AT IGNITE</p><h1>Ship it. <span>Then eat it.</span></h1><p className="subtitle">Less merge conflicts. More maple syrup. Your 60-second kitchen awaits.</p></div><div className="time-badge"><strong>60</strong><span>SECONDS<br />TO SHIP</span></div></div>

      <nav className="tabs" aria-label="App sections">
        <button className={view === 'kitchen' ? 'active' : ''} disabled={playing} onClick={() => setView('kitchen')}><span aria-hidden="true">&gt;_</span> The kitchen</button>
        <button className={view === 'challenges' ? 'active' : ''} disabled={playing} onClick={() => setView('challenges')}><span aria-hidden="true">&#9734;</span> Challenges <span className="count">{progress.completed.length}/{challenges.length}</span></button>
        <button className={view === 'board' ? 'active' : ''} disabled={playing} onClick={() => setView('board')}><span aria-hidden="true">&#9776;</span> Build Board <span className="count">{boardItems.filter(item => item.status !== 'Done').length}</span></button>
        <span className="nav-note">{playing ? 'Round live \u00b7 no pauses, chef!' : 'Made for curious developers & hungry humans'}</span>
      </nav>

      {(saved.warning || audioWarning) && <div className="warning" role="status">{saved.warning}{saved.warning && audioWarning && ' '}{audioWarning}</div>}

      {view === 'board' ? <section className="board-view">
        <div className="section-title"><div><p className="eyebrow">FROM IDEA TO DONE</p><h2>The next delicious release.</h2><p>A living backlog for this app. Come back to chat to request a feature and update its status. Hit <strong>Copy prompt</strong> on any card and paste it into chat.</p></div><span className="outline-badge">Chat-maintained</span></div>
        <div className="board-columns">{(['Planned', 'In Progress', 'Done'] as const).map(status => <section className="board-column" key={status}><h3><span className={`status-dot ${status.toLowerCase().replace(' ', '-')}`} />{status}<span className="count">{boardItems.filter(item => item.status === status).length}</span></h3>
          {boardItems.filter(item => item.status === status).map(item => <article className="board-card" key={item.id}><small>{item.id} <span>{item.category}</span></small><h4>{item.title}</h4><p>{item.description}</p>{item.status !== 'Done' && <button className={`copy-button ${copied?.id === item.id ? copied.ok ? 'copied' : 'failed' : ''}`} onClick={() => copyPrompt(item.id, boardPrompt(item))} aria-label={`Copy chat prompt for ${item.id}`} title={boardPrompt(item)}><span aria-hidden="true">{copied?.id === item.id && copied.ok ? '\u2713' : '\u29C9'}</span>{copied?.id === item.id ? copied.ok ? 'Copied! Paste it in chat' : 'Copy failed' : 'Copy prompt'}</button>}</article>)}
          {!boardItems.some(item => item.status === status) && <p className="empty-column">Nothing here yet. Good things are cooking.</p>}
        </section>)}</div>
        <p className="board-tip"><strong>Try your next chat:</strong> copy any Planned card&apos;s prompt and paste it into chat to build it. This board tracks development, not player tasks. Visitors cannot edit it.</p>
      </section> : view === 'challenges' ? <section className="challenges-view">
        <div className="section-title"><div><p className="eyebrow">SMALL WINS. SWEET REWARDS.</p><h2>Your kitchen achievements.</h2><p>Shared booth progress, saved only in this browser. Every chef can help unlock these.</p></div><button className="primary" onClick={() => start()}>Take the challenge <span aria-hidden="true">&rarr;</span></button></div>
        <ChallengeList progress={progress} game={roundGame} />
        <div className="score-history"><h3>Local high scores</h3>{progress.scores.length ? <ol>{progress.scores.map((score, index) => <li key={index}><span>#{index + 1}</span><strong>{score.toLocaleString()}</strong><small>pts</small></li>)}</ol> : <p>No scores yet. The first delicious commit could be yours.</p>}</div>
      </section> : <div className="kitchen-layout">
        <section className="kitchen-panel" aria-label="Cooking game">
          <div className="panel-toolbar"><span><span className={`live-dot ${playing ? '' : 'idle'}`} /> {game?.practice ? 'tutorial.tsx \u2014 PRACTICE' : playing ? 'kitchen.tsx \u2014 RUNNING' : game?.ended ? 'kitchen.tsx \u2014 SHIPPED' : 'kitchen.tsx \u2014 READY'}</span><button className="sound-button" aria-pressed={sound} onClick={() => { setAudioWarning(''); setSound(value => !value); }}>{sound ? '\u266b Sound on' : '\u266b Sound off'}</button></div>
          {!game ? <>
            <div className="welcome-hero"><div className="hero-copy"><span className="tiny-tag">A LITTLE CHAOS. A LOT OF BUTTER.</span><h2>Welcome to your<br /><span>sweetest sprint.</span></h2><p>Waffles on the iron. Cookies on the hob. Lattes at the bar.<br />Can you ship them before they burn?</p><button className="primary start-button" onClick={() => start()}>Let&apos;s cook <span aria-hidden="true">&rarr;</span><kbd>60s</kbd></button><button className="text-button practice-button" onClick={() => start(true)}>New here? Try a practice run <span aria-hidden="true">&rarr;</span></button><span className="start-hint">No sign-up. No timer in practice. Just click, cook, repeat.</span></div><div className="hero-food"><div className="food-halo" /><Food recipe="waffles" /><span className="floating-label label-top"><span className="live-dot" /> ready to merge</span><span className="floating-label label-bottom">+100 delicious points</span><span className="sparkle s1" aria-hidden="true">+</span><span className="sparkle s2" aria-hidden="true">+</span></div></div>
            <div className="how-to"><h3><span aria-hidden="true">//</span> Your first delicious deployment</h3><div className="steps"><div><b>01</b><strong>Pick a ticket</strong><p>Choose an order from the queue.</p></div><div><b>02</b><strong>Fire it up</strong><p>Click its station. Juggle all three!</p></div><div><b>03</b><strong>Ship it hot</strong><p>Click when ready. Don&apos;t let it burn.</p></div></div></div>
            <div className="menu-strip">{recipes.map(recipe => <div key={recipe.id} style={accentStyle(recipe.accent)}><Food recipe={recipe.id} /><span><small>{recipe.tag}</small><strong>{recipe.short}</strong></span></div>)}</div>
          </> : game.ended ? <div className="results">
            <span className="results-icon" aria-hidden="true">&#10003;</span><p className="eyebrow">DEPLOYMENT COMPLETE</p><h2>That was a sweet ship.</h2><p>The kitchen&apos;s closed. The bragging rights are open.</p><div className="final-score">{game.score.toLocaleString()}<span>POINTS SHIPPED</span></div>
            <div className="result-stats"><span><strong>{game.served}</strong> dishes served</span><span><strong>{game.perfects}</strong> perfect plates</span><span><strong>{game.burns}</strong> burned builds</span><span><strong>{best.toLocaleString()}</strong> browser best</span></div>
            <div className="earned-summary" aria-live="polite">{earnedChallenges(game).filter(id => !beforeRound.current.includes(id)).length ? <><strong>New achievements unlocked!</strong><span>{challenges.filter(challenge => earnedChallenges(game).includes(challenge.id) && !beforeRound.current.includes(challenge.id)).map(challenge => challenge.name).join(' \u00b7 ')}</span></> : <span>{game.served ? 'Nice work, chef. Another round, another release.' : 'Tip: select a ticket, click its station, then click again when READY.'}</span>}</div>
            <button className="primary start-button" onClick={() => start()}>Play again <span aria-hidden="true">&rarr;</span></button><button className="text-button" onClick={() => setView('challenges')}>View challenges & scores</button>
          </div> : <>
            <div className="game-stats"><div><small>SCORE</small><strong>{game.score.toLocaleString().padStart(3, '0')} <span>pts</span></strong></div>{game.practice ? <div className="round-timer practice"><small>PRACTICE MODE</small><strong>No timer</strong></div> : <div className={`round-timer ${seconds <= 10 ? 'urgent' : ''}`} role="timer" aria-label={`${seconds} seconds remaining`}><small>TIME TO SHIP</small><strong>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</strong></div>}<div><small>SERVED / BURNED</small><strong>{game.served} <span>/ {game.burns}</span></strong></div></div>
            {!game.practice && <div className="round-track"><div style={{ width: `${left / ROUND_MS * 100}%` }} /></div>}
            {step && <div className={`coach ${step}`}><span className="coach-step" aria-hidden="true">{step === 'done' ? '\u2713' : `${coach[step].step}/4`}</span><div><strong>{coach[step].title}</strong><p>{coach[step].text}</p></div><div className="coach-actions">{step === 'done' && <button className="primary" onClick={() => start()}>Start the 60s round <span aria-hidden="true">&rarr;</span></button>}<button className="text-button" onClick={exitPractice}>{step === 'done' ? 'Exit practice' : 'Skip tutorial'}</button></div></div>}
            <div className="order-section"><div className="mini-heading"><h3>Incoming orders</h3><span>SELECT A TICKET &darr;</span></div><div className="tickets">{game.orders.map(order => {
              const recipe = recipeFor(order.recipe);
              const batch = Object.values(game.stations).find(item => item?.orderId === order.id);
              const state = batch ? phase(batch, now) : null;
              return <button key={order.id} style={accentStyle(recipe.accent)} className={`ticket ${game.selected === order.id ? 'selected' : ''} ${(step === 'select' || step === 'parallel') && !batch && game.selected !== order.id && !game.stations[recipe.station] ? 'coach-target' : ''}`} aria-pressed={game.selected === order.id} disabled={Boolean(batch)} onClick={() => send({ type: 'select', id: order.id })}><span className="ticket-number">#{String(order.id + 1).padStart(3, '0')}<span>{state === 'ready' ? 'READY!' : state === 'burned' ? 'BURNED' : batch ? 'COOKING' : '+100 PTS'}</span></span><Food recipe={recipe.id} /><strong>{recipe.name}</strong><small>{stationFor(recipe.station).name} <span aria-hidden="true">&rarr;</span></small></button>;
            })}</div></div>
            <div className="stations">{stations.map(station => {
              const batch = game.stations[station.id];
              const recipe = batch ? recipeFor(batch.recipe) : null;
              const state = batch ? phase(batch, now) : 'idle';
              const elapsed = batch ? now - batch.startedAt : 0;
              const readyLeft = recipe ? Math.max(0, Math.ceil((recipe.cookMs + recipe.serveMs - elapsed) / 1000)) : 0;
              const percentage = recipe ? state === 'cooking' ? elapsed / recipe.cookMs * 100 : state === 'ready' ? batch!.safe ? 100 : (recipe.cookMs + recipe.serveMs - elapsed) / recipe.serveMs * 100 : 100 : 0;
              const compatible = selection?.station === station.id;
              return <button key={station.id} className={`station ${state} ${compatible && !batch ? 'compatible' : ''} ${step && ((compatible && !batch && step !== 'serve') || (step === 'serve' && state === 'ready')) ? 'coach-target' : ''}`} onClick={() => send({ type: 'station', station: station.id })}><span className="station-label">{station.label}</span><div className="station-visual">{recipe ? <Food recipe={recipe.id} burned={state === 'burned'} /> : <div className={`empty-appliance ${station.id}`}><span aria-hidden="true">{station.id === 'waffle' ? '#' : station.id === 'espresso' ? '\u2615' : '\u25ce'}</span></div>}{state === 'cooking' && <span className="steam" aria-hidden="true">~ ~ ~</span>}</div><span className="station-name">{station.name}<span className={`state-pill ${state}`}>{state === 'ready' ? 'READY!' : state.toUpperCase()}</span></span><strong className="station-action">{state === 'idle' ? compatible ? `Cook ${selection.short}` : 'Select a matching ticket' : state === 'cooking' ? `Cooking... ${Math.max(1, Math.ceil((recipe!.cookMs - elapsed) / 1000))}s` : state === 'ready' ? elapsed - recipe!.cookMs <= PERFECT_WINDOW_MS ? `\u26A1 Serve now for Perfect +${PERFECT_BONUS}!` : batch!.safe ? 'Click to serve! \u00b7 no rush in practice' : `Click to serve! \u00b7 ${readyLeft}s before burn` : 'Oh no! Click to clear'}</strong><span className="station-progress"><span style={{ width: `${percentage}%` }} /></span>{game.lastPerfect?.station === station.id && now - game.lastPerfect.at < 1200 && <span className="perfect-pop" key={game.lastPerfect.at} aria-hidden="true">Perfect! +{PERFECT_BONUS}</span>}</button>;
            })}</div>
            <p className="game-message" role="status">{game.message}</p>
          </>}
          <div className="panel-footer"><span><span className="keyboard-icon" aria-hidden="true">&#8984;</span> Mouse-first kitchen</span><span>{playing ? 'Three stations. One chef. You got this.' : '100% sweet. 0% production incidents.'}</span></div>
        </section>

        <aside>
          <section className="side-card score-card"><div className="mini-heading"><h2>Kitchen record</h2><span aria-hidden="true">&#9873;</span></div><p className="record-score">{best.toLocaleString()}<small>pts</small></p><p>The high score to beat.<br />Saved on this browser, shared by all chefs.</p><div className="score-card-footer"><span className="live-dot" /> Local leaderboard</div></section>
          <section className="side-card"><div className="mini-heading"><h2>Side quests</h2><span className="count">{progress.completed.length}/{challenges.length}</span></div><ChallengeList progress={progress} game={roundGame} /><button className="text-button side-link" disabled={playing} onClick={() => setView('challenges')}>Explore challenges <span aria-hidden="true">&rarr;</span></button></section>
          <section className="next-card"><span className="code-logo" aria-hidden="true">&lt;/&gt;</span><h3>Good games keep shipping.</h3><p>More treats? Combo streaks? Come back to chat and build what&apos;s next.</p><button className="text-button" disabled={playing} onClick={() => setView('board')}>Open the Build Board <span aria-hidden="true">&rarr;</span></button></section>
        </aside>
      </div>}
      <footer className="site-footer"><span><span className="terminal-mark" aria-hidden="true">&gt;_</span> Built for the joy of building.</span><span>GitHub inspired <i /> Microsoft flavored <i /> VS Code energy</span><small>Unofficial event tribute. Not affiliated with or endorsed by Microsoft or GitHub.</small></footer>
    </main>
  </div>;
}
