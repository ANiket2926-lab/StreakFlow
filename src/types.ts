export interface Habit {
    id: number;
    name: string;
    type: 'boolean' | 'numeric';
    color: string;
    target_value?: number;
    created_at: string;
}

export interface Record {
    id: number;
    habit_id: number;
    date: string; // YYYY-MM-DD
    status: 'completed' | 'missed' | 'skipped' | 'none';
    value?: number;
}

export interface HabitWithRecords extends Habit {
    records: Record[];
}
