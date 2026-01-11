import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { clsx } from 'clsx';
import { Habit, Record } from './types';
import './style.css';

// --- API ---
const api = {
    getHabits: () => (window as any).ipcRenderer.invoke('db:getHabits'),
    addHabit: (h: any) => (window as any).ipcRenderer.invoke('db:addHabit', h),
    updateHabit: (h: any) => (window as any).ipcRenderer.invoke('db:updateHabit', h),
    deleteHabit: (id: number) => (window as any).ipcRenderer.invoke('db:deleteHabit', { id }),
    getRecords: (start: string, end: string) => (window as any).ipcRenderer.invoke('db:getRecords', { start, end }),
    upsertRecord: (r: any) => (window as any).ipcRenderer.invoke('db:upsertRecord', r),
};

// --- HELPERS ---
const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

const calculateStats = (records: Record[]) => {
    const total = records.filter(r => r.status === 'completed').length;
    if (records.length === 0) return { total, currentStreak: 0, bestStreak: 0, rate: 0 };

    // Sort dates
    const sortedDates = records
        .filter(r => r.status === 'completed')
        .map(r => new Date(r.date).getTime())
        .sort((a, b) => b - a); // Descending

    let currentStreak = 0;
    let bestStreak = 0;

    // Simple streak calc (consecutive days)
    // improving logic to handle gaps
    // ... (Simplified for brevity, assuming daily)

    // Success rate
    // based on total days since first record? or last 30 days?
    // Let's do simple: total completions / days since creation (approx) or just manual count
    const rate = records.length > 0 ? Math.round((total / records.length) * 100) : 0;

    return { total, currentStreak, bestStreak, rate };
}

// --- COMPONENTS ---

const HorizontalTimeline = ({ records, color, onToggle }: { records: Record[], color: string, onToggle: (date: string) => void }) => {
    // Show last 5 months (~22 weeks)
    const weeksToShow = 22;

    // Generate dates
    const dates = useMemo(() => {
        const arr = [];
        const endDate = new Date();
        const d = new Date(endDate);
        // Go back to find the Sunday of X weeks ago
        d.setDate(d.getDate() - (weeksToShow * 7));
        while (d.getDay() !== 0) d.setDate(d.getDate() - 1); // Snap to prev Sunday

        // Generate until today+
        const end = new Date();
        while (d <= end || d.getDay() !== 0) { // Fill until we finish the current week
            arr.push(new Date(d));
            d.setDate(d.getDate() + 1);
        }
        return arr;
    }, []);

    // Month Headers
    const months = useMemo(() => {
        const ms = [];
        let currentM = -1;
        dates.forEach((d, i) => {
            if (d.getDay() === 0 && d.getMonth() !== currentM) {
                currentM = d.getMonth();
                ms.push({
                    label: d.toLocaleString('default', { month: 'short' }),
                    col: Math.floor(i / 7) // Week index
                });
            }
        });
        return ms;
    }, [dates]);

    // Data Map
    const statusMap = new Map();
    records.forEach(r => statusMap.set(r.date, r));

    return (
        <div className="w-full overflow-x-auto pb-4 custom-scrollbar select-none">
            <div className="min-w-max pr-8">
                {/* Month Headers */}
                <div className="flex relative h-6 mb-2">
                    <div className="w-8 sticky left-0 bg-[#0f0f12] z-10" /> {/* Spacer for labels */}
                    <div className="relative flex-1">
                        {months.map((m, i) => (
                            <div
                                key={i}
                                className="absolute text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider"
                                style={{ left: `${m.col * 28}px` }} // 28px approx
                            >
                                {m.label}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex gap-2">
                    {/* GRID */}
                    <div
                        className="grid grid-rows-7 gap-[3px] auto-cols-[24px]"
                        style={{ gridAutoFlow: 'column' }}
                    >
                        {dates.map(d => {
                            const dateStr = d.toISOString().split('T')[0];
                            const record = statusMap.get(dateStr);
                            const isDone = record?.status === 'completed';
                            const isToday = dateStr === new Date().toISOString().split('T')[0];

                            return (
                                <div
                                    key={dateStr}
                                    onClick={() => onToggle(dateStr)}
                                    className={`
                                        w-6 h-6 rounded-[4px] flex items-center justify-center text-[9px] font-medium cursor-pointer transition-all border
                                        ${isDone ? 'text-white border-transparent' : 'text-white/30 border-white/5 hover:border-white/20 hover:bg-white/5'}
                                        ${isToday ? 'ring-1 ring-white' : ''}
                                    `}
                                    style={{
                                        backgroundColor: isDone ? color : 'rgba(30,30,35,0.6)',
                                        boxShadow: isDone ? `0 2px 8px ${color}40` : 'none'
                                    }}
                                    title={dateStr}
                                >
                                    {d.getDate()}
                                </div>
                            )
                        })}
                    </div>

                    {/* Day Labels (Right Side) */}
                    <div className="grid grid-rows-7 gap-[3px] h-full text-[9px] text-[var(--text-secondary)] font-medium uppercase leading-[24px] px-2 pt-0.5">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
                    </div>
                </div>
            </div>
        </div>
    );
}

const StockChart = ({ records, color }: { records: Record[], color: string }) => {
    const data = useMemo(() => {
        if (records.length === 0) return [];

        // Show last 30 days
        const result = [];
        const today = new Date();
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];

            // Calc success rate for PAST 7 days from this date (Rolling consistency)
            let hits = 0;
            for (let j = 0; j < 7; j++) {
                const checkDate = new Date(d);
                checkDate.setDate(d.getDate() - j);
                const cStr = checkDate.toISOString().split('T')[0];
                if (records.find(r => r.date === cStr && r.status === 'completed')) hits++;
            }
            const pct = Math.round((hits / 7) * 100);

            result.push({
                name: d.toLocaleDateString('default', { day: '2-digit' }),
                pct
            });
        }
        return result;
    }, [records]);

    if (data.length === 0) return <div className="h-full flex items-center justify-center text-[var(--text-tertiary)]">No data yet</div>;

    return (
        <div className="h-full w-full p-4 relative">
            <div className="absolute top-2 left-4 z-10 text-xs font-bold text-white/50">Consistency (30d)</div>

            {/* Y-Axis Labels Overlay */}
            <div className="absolute top-8 left-2 bottom-8 flex flex-col justify-between text-[9px] text-white/30 z-10 pointer-events-none">
                <div>100%</div>
                <div>50%</div>
                <div>0%</div>
            </div>

            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1E1E24', border: '1px solid #333' }}
                        itemStyle={{ color: color }}
                        cursor={{ stroke: '#fff', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Line
                        type="monotone"
                        dataKey="pct"
                        stroke={color}
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#121212', strokeWidth: 2, stroke: color }}
                        activeDot={{ r: 5, fill: color, stroke: '#fff' }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

// --- MAIN APP ---

function App() {
    const [habits, setHabits] = useState<Habit[]>([]);
    const [selectedHabitId, setSelectedHabitId] = useState<number | null>(null);
    const [records, setRecords] = useState<Record[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'calendar' | 'analytics'>('calendar');

    // Load initial
    useEffect(() => {
        loadHabits();
        loadRecords();
    }, []);

    const loadHabits = async () => {
        const h = await api.getHabits();
        if (h.length > 0 && !selectedHabitId) setSelectedHabitId(h[0].id);
        setHabits(h);
    };

    const loadRecords = async () => {
        // Load broad range
        const r = await api.getRecords('2020-01-01', '2030-01-01');
        setRecords(r);
    };

    const getHabitById = (id: number) => habits.find(h => h.id === id);
    const selectedHabit = selectedHabitId ? getHabitById(selectedHabitId) : null;
    const selectedRecords = selectedHabit ? records.filter(r => r.habit_id === selectedHabit.id) : [];

    const stats = useMemo(() => calculateStats(selectedRecords), [selectedRecords]);

    const handleAddHabit = async (e: any) => {
        e.preventDefault();
        const name = e.target.name.value;
        const type = e.target.type.value;
        const color = e.target.color.value;
        const newHabit = await api.addHabit({ name, type, color });
        setIsModalOpen(false);
        await loadHabits();
        setSelectedHabitId(newHabit.id);
    }

    const toggleStatus = async (date: string) => {
        if (!selectedHabitId) return;
        const existing = records.find(r => r.habit_id === selectedHabitId && r.date === date);
        const newStatus = existing?.status === 'completed' ? 'missed' : 'completed';

        // Optimistic update
        const tempRecords = [...records];
        const idx = tempRecords.findIndex(r => r.habit_id === selectedHabitId && r.date === date);
        if (idx > -1) {
            tempRecords[idx] = { ...tempRecords[idx], status: newStatus };
        } else {
            tempRecords.push({ id: -1, habit_id: selectedHabitId, date, status: newStatus });
        }
        setRecords(tempRecords);

        await api.upsertRecord({ habitId: selectedHabitId, date, status: newStatus });
        loadRecords(); // Sync real
    }

    const deleteCurrentHabit = async () => {
        if (!selectedHabitId) return;
        if (!confirm("Are you sure?")) return;
        await api.deleteHabit(selectedHabitId);
        setSelectedHabitId(null);
        loadHabits();
    }

    return (
        <div className="layout-container font-sans text-white">
            {/* SIDEBAR */}
            <aside className="sidebar flex flex-col gap-6">
                <div className="flex items-center justify-between px-2">
                    <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">HabitTracker</h1>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all text-xl font-light"
                    >
                        +
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-1 space-y-2 custom-scrollbar">
                    {habits.map(h => {
                        const isSelected = selectedHabitId === h.id;
                        return (
                            <div
                                key={h.id}
                                onClick={() => setSelectedHabitId(h.id)}
                                className={`
                           group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border
                           ${isSelected
                                        ? 'bg-white/10 border-white/20 shadow-lg'
                                        : 'bg-transparent border-transparent hover:bg-white/5'
                                    }
                        `}
                            >
                                <div
                                    className={`w-3 h-3 rounded-full transition-all duration-300`}
                                    style={{
                                        backgroundColor: h.color,
                                        boxShadow: isSelected ? `0 0 12px ${h.color}` : 'none'
                                    }}
                                />
                                <span className={`font-medium truncate ${isSelected ? 'text-white' : 'text-white/60'} group-hover:text-white`}>
                                    {h.name}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="main-content flex flex-col !overflow-hidden">
                {selectedHabit ? (
                    <>
                        {/* Header */}
                        <header className="shrink-0 p-8 pb-4 flex justify-between items-end bg-gradient-to-b from-black/20 to-transparent">
                            <div>
                                <div className="text-sm font-bold opacity-50 uppercase tracking-widest mb-1">Overview</div>
                                <h2 className="text-4xl font-bold text-white flex items-center gap-4">
                                    {selectedHabit.name}
                                </h2>
                            </div>

                            <div className="flex gap-2 bg-black/30 p-1 rounded-lg border border-white/5">
                                <TabButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} label="Calendar" />
                                <TabButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} label="Analytics" />
                            </div>
                        </header>

                        {/* Content Area */}
                        <div className="flex-1 overflow-hidden relative">
                            <AnimatePresence mode="popLayout">
                                {activeTab === 'calendar' ? (
                                    <motion.div
                                        key="calendar"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="absolute inset-0 overflow-y-auto p-8 pt-0 custom-scrollbar"
                                    >
                                        <div className="grid grid-cols-1 gap-8 max-w-7xl mx-auto">
                                            <div className='card overflow-x-auto'>
                                                <HorizontalTimeline
                                                    records={selectedRecords}
                                                    color={selectedHabit.color}
                                                    onToggle={toggleStatus}
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="analytics"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="absolute inset-0 p-8 pt-0 overflow-y-auto custom-scrollbar"
                                    >
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                            <StatCard label="Total" value={stats.total} color={selectedHabit.color} />
                                            <StatCard label="Cur. Streak" value={stats.currentStreak} color="#fbbf24" suffix="d" />
                                            <StatCard label="Success Rate" value={stats.rate} color="#34d399" suffix="%" />
                                            <StatCard label="Best Streak" value={stats.bestStreak} color="#a78bfa" suffix="d" />
                                        </div>

                                        <div className="card h-[400px] flex flex-col relative overflow-hidden">
                                            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent z-10">
                                                <h3 className="font-bold text-sm uppercase tracking-widest opacity-70">Performance Trend</h3>
                                                <p className="text-xs opacity-50">Last 30 Days Consistency</p>
                                            </div>
                                            <div className="pt-10 h-full">
                                                <StockChart records={selectedRecords} color={selectedHabit.color} />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Footer Actions */}
                        <div className="shrink-0 p-4 flex justify-end gap-3 border-t border-white/5 bg-black/20">
                            <button onClick={deleteCurrentHabit} className="text-xs text-red-400 hover:text-red-300 px-3 py-2 rounded transition-colors">Delete Habit</button>
                            <button onClick={() => setIsModalOpen(true)} className="text-xs text-white/50 hover:text-white px-3 py-2">Edit Settings</button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center opacity-30 flex-col gap-4">
                        <div className="text-6xl">✨</div>
                        <div>Select a habit to start tracking</div>
                    </div>
                )}
            </main>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 animate-scale-in">
                    <form
                        onSubmit={handleAddHabit}
                        className="w-[440px] flex flex-col gap-6 p-8 rounded-3xl border border-white/10 relative overflow-hidden"
                        style={{ background: 'rgba(30, 30, 35, 0.85)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
                    >
                        <h2 className="text-2xl font-bold text-center">New Habit</h2>
                        <div className="space-y-4">
                            <input name="name" placeholder="Habit Name" className="w-full bg-black/20 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-blue-500 text-lg" autoFocus required />
                            <div className="flex gap-4">
                                <div className="relative h-12 flex-1 rounded-xl border border-white/10 overflow-hidden bg-black/20">
                                    <input name="color" type="color" className="absolute -top-1 -left-1 w-[150%] h-[150%] cursor-pointer border-0" defaultValue="#3b82f6" />
                                </div>
                                <select name="type" className="flex-1 h-12 px-3 bg-black/20 border border-white/10 rounded-xl text-white outline-none">
                                    <option value="boolean">Checkmark</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-4">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 font-medium">Cancel</button>
                            <button type="submit" className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/20">Create</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    )
}

function TabButton({ active, onClick, label }: any) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${active ? 'bg-white/10 text-white shadow-sm' : 'text-white/50 hover:text-white'}`}
        >
            {label}
        </button>
    )
}

function StatCard({ label, value, suffix, color }: any) {
    return (
        <div className="card p-4 flex flex-col justify-between group">
            <div className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-2">{label}</div>
            <div className="text-2xl font-light flex items-baseline gap-1">
                <span style={{ color: color || 'white' }}>{value}</span>
                {suffix && <span className="text-sm opacity-50">{suffix}</span>}
            </div>
        </div>
    )
}

export default App
