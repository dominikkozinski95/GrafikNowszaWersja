
import type { Shift, Employee, LocationType } from './types';

// Shifts definition
export const SHIFTS: Shift[] = [
  { id: 'OFF', label: 'Wolne', start: 0, end: 0, hours: 0, type: 'absence' },
  // Work Shifts
  { id: '8-15', label: '08:00 - 15:00', start: 8, end: 15, hours: 7, type: 'work' },
  { id: '10-17', label: '10:00 - 17:00', start: 10, end: 17, hours: 7, type: 'work' },
  // 12:00 start (becomes 12-19 for 7h, 12-20 for 8h)
  { id: '12-19', label: '12:00 - 19:00', start: 12, end: 19, hours: 7, type: 'work' },
  // 13:00 start (Specific for 8h system: 13-21)
  { id: '13-21', label: '13:00 - 21:00', start: 13, end: 21, hours: 7, type: 'work' },
  // 14:00 start (Specific for 7h system: 14-21)
  { id: '14-21', label: '14:00 - 21:00', start: 14, end: 21, hours: 7, type: 'work' },
  
  // Absences
  { id: 'UW', label: 'Urlop Wypoczynkowy', start: 8, end: 15, hours: 7, type: 'absence' },
  { id: 'UŻ', label: 'Urlop na Żądanie', start: 8, end: 15, hours: 7, type: 'absence' },
  { id: 'L4', label: 'Zwolnienie Lekarskie', start: 0, end: 24, hours: 7, type: 'absence' },
  { id: 'O', label: 'Opieka', start: 8, end: 15, hours: 7, type: 'absence' },
];

// Rotation pattern for UoP (Updated to use 12-19 instead of 11-19)
export const ROTATION_PATTERN = ['8-15', '14-21', '10-17', '12-19'];

// Staffing Requirements
export const MIN_STAFF_MORNING = 15; // 08:00
export const MIN_STAFF_EVENING = 8;  // 20:00 - 21:00

export const INITIAL_TEAMS = ['Confirmers', 'MLT Budna', 'MLT Szewczuk', 'MLT Kobiera', 'MLT Łuczak', 'Buying'];

export const LOCATIONS: LocationType[] = ['Katowice', 'Łódź', 'Ostrava'];

export const TARGET_HOURS_UOP = 140;
export const WEEKLY_LIMIT_UOP = 35; 

export const MONTH_NAMES = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
];

// 35 Pracowników (32 UoP, 3 UZ) dla zapewnienia pokrycia (15 rano + 8 wieczorem wymaga min. 33 osób w rotacji)
export const INITIAL_EMPLOYEES: Employee[] = [
  // ZESPÓŁ: Confirmers (6osób)
  { id: '1', name: 'Bartosz Kolo', team: 'Confirmers', contract: 'UoP', location: 'Katowice', workSystem: '7h' },
  { id: '2', name: 'Potempa Patryk', team: 'Confirmers', contract: 'UoP', location: 'Katowice', workSystem: '7h' },
  { id: '3', name: 'Chałupka Grzegorz', team: 'Confirmers', contract: 'UoP', location: 'Katowice', workSystem: '7h' },
  { id: '4', name: 'Sebastian Haładus', team: 'Confirmers', contract: 'UZ', location: 'Katowice', workSystem: '7h', generationType: 'auto' },
  { id: '5', name: 'Bartłomiej Szafarczyk', team: 'Confirmers', contract: 'UZ', location: 'Katowice', workSystem: '7h', generationType: 'auto' },
  { id: '6', name: 'Mikołaj Jakowlew', team: 'Confirmers', contract: 'UZ', location: 'Katowice', workSystem: '7h',generationType: 'auto' },

  // ZESPÓŁ: MLT Budna (9 osób)
  { id: '7', name: 'Anna Chechelska', team: 'MLT Budna', contract: 'UoP', location: 'Katowice', workSystem: '7h' },
  { id: '8', name: 'Patrycja Gawór', team: 'MLT Budna', contract: 'UoP', location: 'Katowice', workSystem: '7h' },
  { id: '9', name: 'Paulina Hercog', team: 'MLT Budna', contract: 'UoP', location: 'Katowice', workSystem: '7h' },
  { id: '10', name: 'Marta Krawczyk', team: 'MLT Budna', contract: 'UoP', location: 'Katowice', workSystem: '7h' },
  { id: '11', name: 'Wiktoria Matysiak', team: 'MLT Budna', contract: 'UZ', location: 'Katowice', workSystem: '7h', generationType: 'auto' },
  { id: '12', name: 'Aleksandra Mużyłowska', team: 'MLT Budna', contract: 'UZ', location: 'Katowice', workSystem: '7h', generationType: 'auto'},
  { id: '13', name: 'Franciszek Szafarczyk', team: 'MLT Budna', contract: 'UZ', location: 'Katowice', workSystem: '7h', generationType: 'auto' },
  { id: '14', name: 'Iwan Leśniewski', team: 'MLT Budna', contract: 'UZ', location: 'Katowice', workSystem: '7h', generationType: 'manual' },
  { id: '15', name: 'Natalia Zakrzewska', team: 'MLT Budna', contract: 'UZ', location: 'Katowice', workSystem: '7h', generationType: 'auto' },


  // ZESPÓŁ: MLT Szewczuk (8 osób)
  { id: '16', name: 'Paweł Kańka', team: 'MLT Szewczuk', contract: 'UoP', location: 'Katowice', workSystem: '7h' },
  { id: '17', name: 'Szlęzak Katarzyna', team: 'MLT Szewczuk', contract: 'UoP', location: 'Katowice', workSystem: '7h' },
  { id: '18', name: 'Wojciech Szewczyk', team: 'MLT Szewczuk', contract: 'UoP', location: 'Katowice', workSystem: '7h' },
  { id: '19', name: 'Julia Stawowska', team: 'MLT Szewczuk', contract: 'UoP', location: 'Katowice', workSystem: '7h' },
  { id: '20', name: 'Kamil Ciach', team: 'MLT Szewczuk', contract: 'UoP', location: 'Katowice', workSystem: '7h' },
  { id: '21', name: 'Przemysław Rutkowski', team: 'MLT Szewczuk', contract: 'UZ', location: 'Katowice', workSystem: '7h', generationType: 'auto' },
  { id: '22', name: 'Jakub Banasiewicz', team: 'MLT Szewczuk', contract: 'UZ', location: 'Katowice', workSystem: '7h', generationType: 'auto' },
  { id: '23', name: 'Nikola Kostuchowska', team: 'MLT Szewczuk', contract: 'UZ', location: 'Katowice', workSystem: '7h', generationType: 'manual' },

  // ZESPÓŁ: MLT Kobiera (8 osób)
  { id: '24', name: 'Kamil Załęczny', team: 'MLT Kobiera', contract: 'UoP', location: 'Łódź', workSystem: '7h' },
  { id: '25', name: 'Wiktoria Komirska', team: 'MLT Kobiera', contract: 'UoP', location: 'Łódź', workSystem: '7h' },
  { id: '26', name: 'Jakub Sztrajber', team: 'MLT Kobiera', contract: 'UoP', location: 'Łódź', workSystem: '7h' },
  { id: '27', name: 'Patrycja Olszewska', team: 'MLT Kobiera', contract: 'UZ', location: 'Łódź', workSystem: '7h', generationType: 'manual' },
  { id: '28', name: 'Patryk Uznański', team: 'MLT Kobiera', contract: 'UZ', location: 'Łódź', workSystem: '7h', generationType: 'auto' },
  { id: '29', name: 'Oliwia Zięba', team: 'MLT Kobiera', contract: 'UZ', location: 'Łódź', workSystem: '7h', generationType: 'auto' },


    // ZESPÓŁ: MLT Łuczak  (8 osób)
  { id: '30', name: 'Eliza Jabłońska', team: 'MLT Łuczak', contract: 'UoP', location: 'Łódź', workSystem: '7h'},
  { id: '31', name: 'Bartosz Kowalczyk', team: 'MLT Łuczak', contract: 'UoP', location: 'Łódź', workSystem: '7h' },
  { id: '32', name: 'Kacper Szwed', team: 'MLT Łuczak', contract: 'UoP', location: 'Łódź', workSystem: '7h' },

    // ZESPÓŁ: Buying  (6 osób)
  { id: '33', name: 'Patryk Bałdys', team: 'Buying', contract: 'UoP', location: 'Katowice', workSystem: '7h' },
  { id: '34', name: 'Olaf Rychłowski', team: 'Buying', contract: 'UoP', location: 'Katowice', workSystem: '7h' },
  { id: '35', name: 'Wiktoria Jaworska', team: 'Buying', contract: 'UoP', location: 'Katowice', workSystem: '7h'},
  { id: '36', name: 'Julia Bielak', team: 'Buying', contract: 'UoP', location: 'Katowice', workSystem: '7h'},
  { id: '37', name: 'Patryk Tabacki', team: 'Buying', contract: 'UZ', location: 'Katowice', workSystem: '7h'},
  { id: '38', name: 'Wiktoria Żak', team: 'Buying', contract: 'UZ', location: 'Katowice', workSystem: '7h'},


];
