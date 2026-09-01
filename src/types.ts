export interface Vacation {
  id?: number;
  employee_id: number;
  start_date: string;
  end_date: string;
  type: 'основна' | 'додаткова' | 'інша';
  status: 'Запланована' | 'Використана';
}

export interface Employee {
  id: number;
  name: string;
  initial: string;
  color: string;
  main_vacation_limit: number;
  additional_vacation_limit: number;
  other_vacation_limit: number;
  vacations: Vacation[];
}

export interface EmployeeStats {
  main_used: number;
  main_remaining: number;
  additional_used: number;
  additional_remaining: number;
  other_used: number;
  other_remaining: number;
}
