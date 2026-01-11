export const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
};

export const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
};

export const getLast365Days = () => {
    const days = [];
    const today = new Date();
    for (let i = 364; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        days.push(formatDate(d));
    }
    return days;
};

export const calculateStreak = (records: { date: string, status: string }[]) => {
    if (!records.length) return { current: 0, best: 0 };

    // Sort records desc
    const sorted = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let current = 0;
    let best = 0;
    let temp = 0;

    // Check if today/yesterday is done
    const todayStr = formatDate(new Date());

    // Logic is complex, simplified:
    // Iterate dates backwards from today.
    // If consecutive, incr current.
    // Best is max of temp.

    // TODO: Implement robust streak logic
    return { current: 0, best: 0 };
}
