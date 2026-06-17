export type ShiftRowId = string;

export interface ScheduleShift {
  id: string;
  year: number;
  month: number;
  day: number;
  rowId: ShiftRowId;
  name: string;
  startTime: string;
  endTime: string;
  duration: string;
}

function shift(
  year: number,
  month: number,
  day: number,
  rowId: ShiftRowId,
  name: string,
  start: string,
  end: string,
  duration: string
): ScheduleShift {
  return {
    id: `${year}-${month}-${day}-${rowId}-${name}`,
    year,
    month,
    day,
    rowId,
    name,
    startTime: start,
    endTime: end,
    duration,
  };
}

const SEED_YEAR = 2026;
const SEED_MONTH = 6;

const s = (
  day: number,
  rowId: ShiftRowId,
  name: string,
  start: string,
  end: string,
  duration: string
) => shift(SEED_YEAR, SEED_MONTH, day, rowId, name, start, end, duration);

export const mockShifts: ScheduleShift[] = [
  s(1, 'morning', '다현', '10:00', '14:00', '04'),
  s(1, 'afternoon1', '유진', '14:00', '18:00', '04'),
  s(1, 'middle', '준호', '18:00', '22:00', '04'),
  s(1, 'night', '태수', '22:00', '02:00', '04'),

  s(2, 'morning', '지안', '10:00', '14:00', '04'),
  s(2, 'afternoon1', '수빈', '14:00', '18:00', '04'),
  s(2, 'afternoon2', '보연', '15:00', '19:00', '04'),
  s(2, 'night', '예선', '22:00', '06:00', '08'),

  s(3, 'morning', '주현', '08:00', '15:00', '07'),
  s(3, 'afternoon1', '혜인', '14:00', '21:00', '07'),
  s(3, 'middle', '정환', '17:00', '01:00', '08'),

  s(4, 'morning', '다현', '10:00', '14:00', '04'),
  s(4, 'afternoon1', '유진', '14:00', '18:00', '04'),
  s(4, 'training', '준호', '16:00', '18:00', '02'),

  s(5, 'morning', '성재', '10:00', '14:00', '04'),
  s(5, 'afternoon1', '유진', '14:00', '21:00', '07'),
  s(5, 'middle', '태수', '21:00', '01:00', '04'),
  s(5, 'night', '지안', '23:00', '06:00', '07'),

  s(6, 'morning', '다현', '13:00', '17:00', '04'),
  s(6, 'afternoon1', '준호', '14:00', '21:00', '07'),
  s(6, 'middle', '수빈', '17:00', '01:00', '08'),
  s(6, 'night', '보연', '00:00', '08:00', '08'),

  s(7, 'morning', '주현', '08:00', '15:00', '07'),
  s(7, 'afternoon1', '예선', '13:00', '17:00', '04'),
  s(7, 'afternoon2', '혜인', '15:00', '24:00', '09'),
  s(7, 'night', '태수', '00:00', '06:00', '06'),

  s(8, 'morning', '지안', '10:00', '14:00', '04'),
  s(8, 'afternoon1', '유진', '14:00', '18:00', '04'),
  s(8, 'middle', '준호', '18:00', '22:00', '04'),

  s(9, 'morning', '다현', '10:00', '14:00', '04'),
  s(9, 'afternoon1', '수빈', '14:00', '18:00', '04'),
  s(9, 'night', '예선', '22:00', '06:00', '08'),
  s(9, 'training', '보연', '16:00', '18:00', '02'),

  s(10, 'morning', '성재', '10:00', '14:00', '04'),
  s(10, 'afternoon1', '혜인', '14:00', '21:00', '07'),
  s(10, 'middle', '정환', '21:00', '01:00', '04'),

  s(11, 'morning', '주현', '10:00', '14:00', '04'),
  s(11, 'afternoon1', '유진', '14:00', '18:00', '04'),
  s(11, 'afternoon2', '준호', '15:30', '23:00', '07'),
  s(11, 'night', '태수', '23:00', '06:00', '07'),

  s(12, 'morning', '지안', '10:00', '14:00', '04'),
  s(12, 'afternoon1', '다현', '14:00', '18:00', '04'),
  s(12, 'middle', '수빈', '18:00', '22:00', '04'),

  s(13, 'morning', '보연', '13:00', '17:00', '04'),
  s(13, 'afternoon1', '예선', '14:00', '21:00', '07'),
  s(13, 'middle', '준호', '17:00', '01:00', '08'),

  s(14, 'morning', '주현', '08:00', '15:00', '07'),
  s(14, 'afternoon1', '혜인', '13:00', '17:00', '04'),
  s(14, 'afternoon2', '유진', '15:00', '24:00', '09'),
  s(14, 'night', '지안', '00:00', '06:00', '06'),

  s(15, 'morning', '다현', '10:00', '14:00', '04'),
  s(15, 'afternoon1', '수빈', '14:00', '18:00', '04'),
  s(15, 'training', '태수', '16:00', '18:00', '02'),

  s(16, 'morning', '성재', '10:00', '14:00', '04'),
  s(16, 'afternoon1', '유진', '14:00', '21:00', '07'),
  s(16, 'middle', '준호', '21:00', '01:00', '04'),
  s(16, 'night', '예선', '23:00', '06:00', '07'),

  s(17, 'morning', '지안', '10:00', '14:00', '04'),
  s(17, 'afternoon1', '다현', '14:00', '18:00', '04'),
  s(17, 'afternoon2', '보연', '15:00', '19:00', '04'),

  s(18, 'morning', '주현', '10:00', '14:00', '04'),
  s(18, 'afternoon1', '혜인', '14:00', '18:00', '04'),
  s(18, 'middle', '태수', '18:00', '22:00', '04'),
  s(18, 'night', '수빈', '22:00', '06:00', '08'),

  s(19, 'morning', '유진', '10:00', '14:00', '04'),
  s(19, 'afternoon1', '준호', '14:00', '18:00', '04'),
  s(19, 'training', '정환', '16:00', '18:00', '02'),

  s(20, 'morning', '다현', '13:00', '17:00', '04'),
  s(20, 'afternoon1', '예선', '14:00', '21:00', '07'),
  s(20, 'middle', '지안', '17:00', '01:00', '08'),

  s(21, 'morning', '성재', '08:00', '15:00', '07'),
  s(21, 'afternoon1', '혜인', '13:00', '17:00', '04'),
  s(21, 'afternoon2', '유진', '15:00', '24:00', '09'),
  s(21, 'night', '태수', '00:00', '06:00', '06'),
];
