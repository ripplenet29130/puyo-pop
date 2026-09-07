'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';

const COLS = 6, ROWS = 12;
const COLORS = ['pink', 'blue', 'yellow', 'green'] as const;
type PuyoColor = (typeof COLORS)[number];
type Board = (PuyoColor | null)[][];
type Piece = { x: number; y: number; colors: [PuyoColor, PuyoColor]; rotation: number };
const emptyBoard = (): Board => Array.from({ length: ROWS }, () => Array(COLS).fill(null));
const nextPair = (): [PuyoColor, PuyoColor] => [COLORS[Math.floor(Math.random() * 4)], COLORS[Math.floor(Math.random() * 4)]];
const newPiece = (colors = nextPair()): Piece => ({ x: 2, y: 0, colors, rotation: 0 });
const partner = (p: Piece) => { const s = [[0,-1],[1,0],[0,1],[-1,0]][p.rotation]; return { x: p.x + s[0], y: p.y + s[1] }; };
const cells = (p: Piece) => [{ x:p.x, y:p.y, color:p.colors[0] }, { ...partner(p), color:p.colors[1] }];
const valid = (b: Board, p: Piece) => cells(p).every(({x,y}) => x >= 0 && x < COLS && y >= 0 && y < ROWS && !b[y][x]);
function settle(b: Board) { return b.map((_,y) => Array.from({length:COLS}, (_,x) => b.map(row => row[x]).filter(Boolean).at(-(ROWS-y)) ?? null)); }
function clearGroups(input: Board) {
  const b=input.map(r=>[...r]), seen=new Set<string>(), clear:[number,number][]=[];
  for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++) { if(!b[y][x]||seen.has(`${x},${y}`))continue; const group:[number,number][]=[], q:[number,number][]=[[x,y]]; seen.add(`${x},${y}`); while(q.length){const [cx,cy]=q.shift()!;group.push([cx,cy]);for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,ny=cy+dy,k=`${nx},${ny}`;if(nx>=0&&nx<COLS&&ny>=0&&ny<ROWS&&!seen.has(k)&&b[ny][nx]===b[y][x]){seen.add(k);q.push([nx,ny]);}}}if(group.length>=4)clear.push(...group); }
  clear.forEach(([x,y])=>b[y][x]=null); return { board:settle(b), cleared:clear.length };
}
export default function Home() {
  const [board,setBoard]=useState<Board>(emptyBoard), [piece,setPiece]=useState<Piece>(()=>newPiece()), [next,setNext]=useState<[PuyoColor,PuyoColor]>(()=>nextPair()), [score,setScore]=useState(0), [chain,setChain]=useState(0), [paused,setPaused]=useState(false), [gameOver,setGameOver]=useState(false);
  const spawn=useCallback((b:Board)=>{const fresh=newPiece(next);setNext(nextPair());setPiece(fresh);setChain(0);if(!valid(b,fresh))setGameOver(true);},[next]);
  const lock=useCallback(()=>{setBoard(old=>{const placed=old.map(r=>[...r]);cells(piece).forEach(({x,y,color})=>{if(y>=0)placed[y][x]=color});let result=clearGroups(placed),total=result.cleared,m=1;while(result.cleared){m++;result=clearGroups(result.board);total+=result.cleared*m}if(total){setScore(s=>s+total*10);setChain(m-1)}spawn(result.board);return result.board})},[piece,spawn]);
  const move=useCallback((dx:number,dy=0)=>{if(paused||gameOver)return;const p={...piece,x:piece.x+dx,y:piece.y+dy};if(valid(board,p))setPiece(p);else if(dy)lock()},[board,gameOver,lock,paused,piece]);
  const rotate=useCallback(()=>{if(paused||gameOver)return;const p={...piece,rotation:(piece.rotation+1)%4};if(valid(board,p))setPiece(p)},[board,gameOver,paused,piece]);
  const restart=()=>{setBoard(emptyBoard());setScore(0);setChain(0);setGameOver(false);setPaused(false);setNext(nextPair());setPiece(newPiece())};
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if(['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' '].includes(e.key))e.preventDefault();if(e.key==='ArrowLeft')move(-1);if(e.key==='ArrowRight')move(1);if(e.key==='ArrowDown')move(0,1);if(e.key==='ArrowUp'||e.key===' ')rotate()};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[move,rotate]);
  useEffect(()=>{if(paused||gameOver)return;const timer=window.setInterval(()=>move(0,1),800);return()=>clearInterval(timer)},[gameOver,move,paused]);
  const display=useMemo(()=>board.map(r=>[...r]),[board]);if(!gameOver)cells(piece).forEach(({x,y,color})=>{if(y>=0&&y<ROWS)display[y][x]=color});
  return <main className="game-shell"><section className="game-header"><div><p className="eyebrow">BUBBLE DROP PUZZLE</p><h1>ぷよっと！</h1></div><div className="score-box"><span>SCORE</span><strong>{score.toString().padStart(6,'0')}</strong></div></section><section className="play-area"><aside className="side-panel"><div className="next-label">NEXT</div><div className="next-pair"><i className={`puyo ${next[1]}`}/><i className={`puyo ${next[0]}`}/></div><div className="tip">4つ以上つなげて<br/>まとめて消そう！</div></aside><div className="board-wrap"><div className="board" aria-label="ゲーム盤面">{display.flatMap((row,y)=>row.map((color,x)=><div className="cell" key={`${x}-${y}`}>{color&&<i className={`puyo ${color}`}/>}</div>))}</div>{(paused||gameOver)&&<div className="overlay"><b>{gameOver?'GAME OVER':'PAUSE'}</b><Button onClick={gameOver?restart:()=>setPaused(false)}>{gameOver?'もう一度':'つづける'}</Button></div>}</div><aside className="side-panel status"><div><span>CHAIN</span><strong>{chain}</strong></div><Button variant="outline" onClick={()=>setPaused(!paused)}>{paused?'再開':'一時停止'}</Button><Button variant="ghost" onClick={restart}>リスタート</Button></aside></section><section className="controls" aria-label="ゲーム操作"><Button onClick={()=>move(-1)} aria-label="左へ">←</Button><Button onClick={()=>move(0,1)} aria-label="下へ">↓</Button><Button onClick={()=>move(1)} aria-label="右へ">→</Button><Button className="rotate" onClick={rotate}>回転 ↻</Button></section><p className="keyboard">← →：移動　↓：落下　↑ / Space：回転</p></main>;
}
