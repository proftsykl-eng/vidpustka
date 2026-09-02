import express from "express";
import path from "path";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import * as XLSX from "xlsx";
import { createServer as createViteServer } from "vite";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Promise-based SQLite database wrapper
const dbPromise = open({
  filename: "./vacations.db",
  driver: sqlite3.Database
});

// Helper: Calculate days between two dates (inclusive)
function getDurationInDays(startStr: string, endStr: string): number {
  const s = new Date(startStr + "T00:00:00");
  const e = new Date(endStr + "T00:00:00");
  const diffTime = e.getTime() - s.getTime();
  if (diffTime < 0) return 0;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

async function initDb() {
  const db = await dbPromise;

  // Enable foreign keys
  await db.run("PRAGMA foreign_keys = ON");

  // Create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      initial TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL,
      main_vacation_limit INTEGER NOT NULL DEFAULT 24,
      additional_vacation_limit INTEGER NOT NULL DEFAULT 0,
      other_vacation_limit INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS vacations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Запланована',
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );
  `);

  // Seed default employees if table is empty
  const count = await db.get("SELECT COUNT(*) as count FROM employees");
  if (count.count === 0) {
    const defaultEmployees = [
      { name: "Чорнобровенко О. П.", initial: "Ч", color: "#e74c3c", main: 24, add: 0, other: 0 },
      { name: "Фіщук В. М.", initial: "Ф", color: "#2ecc71", main: 24, add: 4, other: 0 },
      { name: "Мартиненко С. В.", initial: "М", color: "#f1c40f", main: 24, add: 0, other: 5 },
      { name: "Асафатова Т. І.", initial: "А", color: "#9b59b6", main: 24, add: 10, other: 0 },
      { name: "Семенов О. К.", initial: "С", color: "#e67e22", main: 24, add: 0, other: 0 },
      { name: "Троценко Д. А.", initial: "Тр", color: "#3498db", main: 24, add: 2, other: 2 },
      { name: "Стасюк О. М.", initial: "Ст", color: "#1abc9c", main: 24, add: 0, other: 0 },
      { name: "Галадій П. Р.", initial: "Г", color: "#c0392b", main: 24, add: 0, other: 0 },
      { name: "Малиновська-Жукова І. О.", initial: "МЖ", color: "#f39c12", main: 24, add: 5, other: 5 },
      { name: "Демченко А. В.", initial: "Д", color: "#2980b9", main: 24, add: 0, other: 0 },
      { name: "Опришкова Л. С.", initial: "О", color: "#7f8c8d", main: 24, add: 0, other: 0 }
    ];

    for (const emp of defaultEmployees) {
      await db.run(`
        INSERT INTO employees (name, initial, color, main_vacation_limit, additional_vacation_limit, other_vacation_limit)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [emp.name, emp.initial, emp.color, emp.main, emp.add, emp.other]);
    }

    // Seed some initial vacations for 2026
    const employeesInDb = await db.all("SELECT * FROM employees");
    const ch = employeesInDb.find(e => e.initial === "Ч");
    const f = employeesInDb.find(e => e.initial === "Ф");
    const m = employeesInDb.find(e => e.initial === "М");

    if (ch && f && m) {
      // 2026-06-01 to 2026-06-14 (14 days, Основна)
      await db.run(`
        INSERT INTO vacations (employee_id, start_date, end_date, type, status)
        VALUES (?, '2026-06-01', '2026-06-14', 'основна', 'Запланована')
      `, [ch.id]);
      // 2026-08-10 to 2026-08-17 (8 days, Основна)
      await db.run(`
        INSERT INTO vacations (employee_id, start_date, end_date, type, status)
        VALUES (?, '2026-08-10', '2026-08-17', 'основна', 'Використана')
      `, [ch.id]);

      // f: 2026-07-05 to 2026-07-20 (16 days, Основна)
      await db.run(`
        INSERT INTO vacations (employee_id, start_date, end_date, type, status)
        VALUES (?, '2026-07-05', '2026-07-20', 'основна', 'Використана')
      `, [f.id]);
      // f: 2026-11-12 to 2026-11-15 (4 days, Додаткова)
      await db.run(`
        INSERT INTO vacations (employee_id, start_date, end_date, type, status)
        VALUES (?, '2026-11-12', '2026-11-15', 'додаткова', 'Запланована')
      `, [f.id]);

      // m: 2026-05-10 to 2026-05-14 (5 days, Інша)
      await db.run(`
        INSERT INTO vacations (employee_id, start_date, end_date, type, status)
        VALUES (?, '2026-05-10', '2026-05-14', 'інша', 'Використана')
      `, [m.id]);
    }
    console.log("Database seeded successfully with default values.");
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Initialize DB tables and seed
  await initDb();

  // --- REST API ENDPOINTS ---

  // GET /api/employees - Get all employees with their vacations
  app.get("/api/employees", async (req, res) => {
    try {
      const db = await dbPromise;
      const employees = await db.all("SELECT * FROM employees ORDER BY name ASC");
      const vacations = await db.all("SELECT * FROM vacations");

      // Map vacations to employees
      const data = employees.map(emp => {
        const empVacations = vacations.filter(v => v.employee_id === emp.id);
        return {
          ...emp,
          vacations: empVacations
        };
      });

      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: "Помилка завантаження працівників: " + err.message });
    }
  });

  // POST /api/employees - Create new employee
  app.post("/api/employees", async (req, res) => {
    try {
      const { name, initial, color, main_vacation_limit, additional_vacation_limit, other_vacation_limit } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: "ПІБ працівника обов'язкове." });
      }
      if (!initial || !initial.trim()) {
        return res.status(400).json({ error: "Ініціали обов'язкові." });
      }
      if (initial.trim().length > 3) {
        return res.status(400).json({ error: "Ініціали не повинні перевищувати 3 символи." });
      }

      const db = await dbPromise;

      // Check initials collision
      const existing = await db.get("SELECT id FROM employees WHERE initial = ?", [initial.trim()]);
      if (existing) {
        return res.status(400).json({ error: `Ініціали '${initial}' вже використовуються іншим працівником.` });
      }

      const mainLimit = parseInt(main_vacation_limit) || 0;
      const additionalLimit = parseInt(additional_vacation_limit) || 0;
      const otherLimit = parseInt(other_vacation_limit) || 0;

      const result = await db.run(`
        INSERT INTO employees (name, initial, color, main_vacation_limit, additional_vacation_limit, other_vacation_limit)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [name.trim(), initial.trim(), color || "#3498db", mainLimit, additionalLimit, otherLimit]);

      const newEmp = await db.get("SELECT * FROM employees WHERE id = ?", [result.lastID]);
      res.status(201).json({ ...newEmp, vacations: [] });
    } catch (err: any) {
      res.status(500).json({ error: "Помилка додавання працівника: " + err.message });
    }
  });

  // PUT /api/employees/:id - Update existing employee
  app.put("/api/employees/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, initial, color, main_vacation_limit, additional_vacation_limit, other_vacation_limit } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: "ПІБ працівника обов'язкове." });
      }
      if (!initial || !initial.trim()) {
        return res.status(400).json({ error: "Ініціали обов'язкові." });
      }

      const db = await dbPromise;

      // Check initials collision
      const existing = await db.get("SELECT id FROM employees WHERE initial = ? AND id != ?", [initial.trim(), id]);
      if (existing) {
        return res.status(400).json({ error: `Ініціали '${initial}' вже використовуються іншим працівником.` });
      }

      const mainLimit = parseInt(main_vacation_limit) || 0;
      const additionalLimit = parseInt(additional_vacation_limit) || 0;
      const otherLimit = parseInt(other_vacation_limit) || 0;

      await db.run(`
        UPDATE employees 
        SET name = ?, initial = ?, color = ?, main_vacation_limit = ?, additional_vacation_limit = ?, other_vacation_limit = ?
        WHERE id = ?
      `, [name.trim(), initial.trim(), color, mainLimit, additionalLimit, otherLimit, id]);

      // Fetch updated
      const updatedEmp = await db.get("SELECT * FROM employees WHERE id = ?", [id]);
      const empVacations = await db.all("SELECT * FROM vacations WHERE employee_id = ?", [id]);

      res.json({ ...updatedEmp, vacations: empVacations });
    } catch (err: any) {
      res.status(500).json({ error: "Помилка оновлення даних працівника: " + err.message });
    }
  });

  // DELETE /api/employees/:id - Delete employee
  app.delete("/api/employees/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const db = await dbPromise;

      // SQLite foreign key cascade handles vacation removal
      await db.run("DELETE FROM employees WHERE id = ?", [id]);
      res.json({ success: true, message: "Працівника успішно видалено." });
    } catch (err: any) {
      res.status(500).json({ error: "Помилка видалення працівника: " + err.message });
    }
  });

  // POST /api/vacations - Add a vacation period with overlap & limit check
  app.post("/api/vacations", async (req, res) => {
    try {
      const { employee_id, start_date, end_date, type } = req.body;

      if (!employee_id || !start_date || !end_date || !type) {
        return res.status(400).json({ error: "Усі поля обов'язкові." });
      }

      if (start_date > end_date) {
        return res.status(400).json({ error: "Дата початку не може бути пізнішою за дату завершення." });
      }

      const db = await dbPromise;

      // 1. Check if employee exists
      const employee = await db.get("SELECT * FROM employees WHERE id = ?", [employee_id]);
      if (!employee) {
        return res.status(404).json({ error: "Працівника не знайдено." });
      }

      // 2. Validate Overlaps
      const overlaps = await db.all(`
        SELECT * FROM vacations 
        WHERE employee_id = ? 
          AND NOT (end_date < ? OR start_date > ?)
      `, [employee_id, start_date, end_date]);

      if (overlaps.length > 0) {
        return res.status(400).json({ 
          error: "Перетин дат: вибраний період повністю або частково перетинається з іншою відпусткою цього працівника." 
        });
      }

      // 3. Validate Available Days Limit
      let limit = 0;
      const cleanType = (type === "основна" || type === "додаткова") ? type : "інша";

      if (cleanType === "основна") limit = employee.main_vacation_limit;
      else if (cleanType === "додаткова") limit = employee.additional_vacation_limit;
      else if (cleanType === "інша") limit = employee.other_vacation_limit;

      const startYear = start_date.split("-")[0];

      // Fetch all other vacations of this type in the same calendar year
      const existingVacations = await db.all(`
        SELECT * FROM vacations 
        WHERE employee_id = ? AND (start_date LIKE ? OR end_date LIKE ?)
      `, [employee_id, `${startYear}-%`, `${startYear}-%`]);

      const filteredExisting = existingVacations.filter(v => {
        if (cleanType === "основна") return v.type === "основна";
        if (cleanType === "додаткова") return v.type === "додаткова";
        return v.type !== "основна" && v.type !== "додаткова";
      });

      // Count already used days in this year
      let existingDaysInYear = 0;
      for (const v of filteredExisting) {
        const vStart = new Date(v.start_date + "T00:00:00");
        const vEnd = new Date(v.end_date + "T00:00:00");
        const yearStart = new Date(`${startYear}-01-01T00:00:00`);
        const yearEnd = new Date(`${startYear}-12-31T00:00:00`);

        const actualStart = vStart > yearStart ? vStart : yearStart;
        const actualEnd = vEnd < yearEnd ? vEnd : yearEnd;

        if (actualStart <= actualEnd) {
          existingDaysInYear += Math.floor((actualEnd.getTime() - actualStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        }
      }

      // Count new vacation days in this year
      const newStart = new Date(start_date + "T00:00:00");
      const newEnd = new Date(end_date + "T00:00:00");
      const newYearStart = new Date(`${startYear}-01-01T00:00:00`);
      const newYearEnd = new Date(`${startYear}-12-31T00:00:00`);

      const actualNewStart = newStart > newYearStart ? newStart : newYearStart;
      const actualNewEnd = newEnd < newYearEnd ? newEnd : newYearEnd;

      let newDaysInYear = 0;
      if (actualNewStart <= actualNewEnd) {
        newDaysInYear = Math.floor((actualNewEnd.getTime() - actualNewStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      }

      if (existingDaysInYear + newDaysInYear > limit) {
        return res.status(400).json({
          error: `Перевищення ліміту відпустки '${cleanType}' на ${startYear} рік! Ліміт: ${limit} дн., заброньовано: ${existingDaysInYear} дн., не вистачає: ${(existingDaysInYear + newDaysInYear) - limit} дн.`
        });
      }

      // Add vacation
      const result = await db.run(`
        INSERT INTO vacations (employee_id, start_date, end_date, type, status)
        VALUES (?, ?, ?, ?, 'Запланована')
      `, [employee_id, start_date, end_date, type]);

      const inserted = await db.get("SELECT * FROM vacations WHERE id = ?", [result.lastID]);
      res.status(201).json(inserted);
    } catch (err: any) {
      res.status(500).json({ error: "Помилка збереження відпустки: " + err.message });
    }
  });

  // PUT /api/vacations/:id - Edit an existing vacation period
  app.put("/api/vacations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { start_date, end_date, type } = req.body;

      if (!start_date || !end_date || !type) {
        return res.status(400).json({ error: "Усі поля обов'язкові." });
      }

      if (start_date > end_date) {
        return res.status(400).json({ error: "Дата початку не може бути пізнішою за дату завершення." });
      }

      const db = await dbPromise;

      // 1. Fetch current vacation
      const currentVacation = await db.get("SELECT * FROM vacations WHERE id = ?", [id]);
      if (!currentVacation) {
        return res.status(404).json({ error: "Період відпустки не знайдено." });
      }

      const employee_id = currentVacation.employee_id;

      // 2. Fetch employee
      const employee = await db.get("SELECT * FROM employees WHERE id = ?", [employee_id]);
      if (!employee) {
        return res.status(404).json({ error: "Працівника не знайдено." });
      }

      // 3. Validate Overlaps (ignoring this vacation itself)
      const overlaps = await db.all(`
        SELECT * FROM vacations 
        WHERE employee_id = ? 
          AND id != ?
          AND NOT (end_date < ? OR start_date > ?)
      `, [employee_id, id, start_date, end_date]);

      if (overlaps.length > 0) {
        return res.status(400).json({ 
          error: "Перетин дат: вибраний період повністю або частково перетинається з іншою відпусткою цього працівника." 
        });
      }

      // 4. Validate Available Days Limit
      let limit = 0;
      const cleanType = (type === "основна" || type === "додаткова") ? type : "інша";

      if (cleanType === "основна") limit = employee.main_vacation_limit;
      else if (cleanType === "додаткова") limit = employee.additional_vacation_limit;
      else if (cleanType === "інша") limit = employee.other_vacation_limit;

      const startYear = start_date.split("-")[0];

      // Fetch all other vacations in the same calendar year (ignoring this vacation itself)
      const existingVacations = await db.all(`
        SELECT * FROM vacations 
        WHERE employee_id = ? AND id != ? AND (start_date LIKE ? OR end_date LIKE ?)
      `, [employee_id, id, `${startYear}-%`, `${startYear}-%`]);

      const filteredExisting = existingVacations.filter(v => {
        if (cleanType === "основна") return v.type === "основна";
        if (cleanType === "додаткова") return v.type === "додаткова";
        return v.type !== "основна" && v.type !== "додаткова";
      });

      // Count already used days in this year
      let existingDaysInYear = 0;
      for (const v of filteredExisting) {
        const vStart = new Date(v.start_date + "T00:00:00");
        const vEnd = new Date(v.end_date + "T00:00:00");
        const yearStart = new Date(`${startYear}-01-01T00:00:00`);
        const yearEnd = new Date(`${startYear}-12-31T00:00:00`);

        const actualStart = vStart > yearStart ? vStart : yearStart;
        const actualEnd = vEnd < yearEnd ? vEnd : yearEnd;

        if (actualStart <= actualEnd) {
          existingDaysInYear += Math.floor((actualEnd.getTime() - actualStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        }
      }

      // Count new vacation days in this year
      const newStart = new Date(start_date + "T00:00:00");
      const newEnd = new Date(end_date + "T00:00:00");
      const newYearStart = new Date(`${startYear}-01-01T00:00:00`);
      const newYearEnd = new Date(`${startYear}-12-31T00:00:00`);

      const actualNewStart = newStart > newYearStart ? newStart : newYearStart;
      const actualNewEnd = newEnd < newYearEnd ? newEnd : newYearEnd;

      let newDaysInYear = 0;
      if (actualNewStart <= actualNewEnd) {
        newDaysInYear = Math.floor((actualNewEnd.getTime() - actualNewStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      }

      if (existingDaysInYear + newDaysInYear > limit) {
        return res.status(400).json({
          error: `Перевищення ліміту відпустки '${cleanType}' на ${startYear} рік! Ліміт: ${limit} дн., заброньовано: ${existingDaysInYear} дн., не вистачає: ${(existingDaysInYear + newDaysInYear) - limit} дн.`
        });
      }

      // Update vacation
      await db.run(`
        UPDATE vacations 
        SET start_date = ?, end_date = ?, type = ?
        WHERE id = ?
      `, [start_date, end_date, type, id]);

      const updated = await db.get("SELECT * FROM vacations WHERE id = ?", [id]);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: "Помилка оновлення відпустки: " + err.message });
    }
  });

  // PUT /api/vacations/:id/status - Change vacation status
  app.put("/api/vacations/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (status !== "Запланована" && status !== "Використана") {
        return res.status(400).json({ error: "Некоректний статус відпустки." });
      }

      const db = await dbPromise;
      await db.run("UPDATE vacations SET status = ? WHERE id = ?", [status, id]);

      const updated = await db.get("SELECT * FROM vacations WHERE id = ?", [id]);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: "Помилка оновлення статусу відпустки: " + err.message });
    }
  });

  // DELETE /api/vacations/:id - Delete a vacation period
  app.delete("/api/vacations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const db = await dbPromise;

      await db.run("DELETE FROM vacations WHERE id = ?", [id]);
      res.json({ success: true, message: "Період відпустки видалено." });
    } catch (err: any) {
      res.status(500).json({ error: "Помилка видалення відпустки: " + err.message });
    }
  });

  // GET /api/export/excel - Download detailed Excel report using SheetJS (XLSX)
  app.get("/api/export/excel", async (req, res) => {
    try {
      const db = await dbPromise;
      const employees = await db.all("SELECT * FROM employees ORDER BY name ASC");
      const vacations = await db.all("SELECT * FROM vacations");

      const year = 2026;

      const rows = employees.map(emp => {
        const empVacations = vacations.filter(v => v.employee_id === emp.id);

        const getUsedDays = (type: string) => {
          let days = 0;
          empVacations.filter(v => v.type === type).forEach(v => {
            const vStart = new Date(v.start_date + "T00:00:00");
            const vEnd = new Date(v.end_date + "T00:00:00");
            const yearStart = new Date(`${year}-01-01T00:00:00`);
            const yearEnd = new Date(`${year}-12-31T00:00:00`);
            const s = vStart > yearStart ? vStart : yearStart;
            const e = vEnd < yearEnd ? vEnd : yearEnd;
            if (s <= e) {
              days += Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            }
          });
          return days;
        };

        const mainUsed = getUsedDays("основна");
        const addUsed = getUsedDays("додаткова");
        const otherUsed = getUsedDays("інша");

        const periodsStr = empVacations.map(v => 
          `${v.start_date} - ${v.end_date} (${v.type}, ${v.status})`
        ).join("; ");

        return {
          "ПІБ Працівника": emp.name,
          "Ініціали": emp.initial,
          "Основна (Ліміт)": emp.main_vacation_limit,
          "Основна (Використано)": mainUsed,
          "Основна (Залишок)": emp.main_vacation_limit - mainUsed,
          "Додаткова (Ліміт)": emp.additional_vacation_limit,
          "Додаткова (Використано)": addUsed,
          "Додаткова (Залишок)": emp.additional_vacation_limit - addUsed,
          "Інші (Ліміт)": emp.other_vacation_limit,
          "Інші (Використано)": otherUsed,
          "Інші (Залишок)": emp.other_vacation_limit - otherUsed,
          "Періоди відпусток": periodsStr
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Відпустки");

      const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Disposition", `attachment; filename="vacations_report_${year}.xlsx"`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buf);
    } catch (err: any) {
      res.status(500).json({ error: "Помилка експорту Excel: " + err.message });
    }
  });

  // GET /api/export/json - Download Full JSON backup
  app.get("/api/export/json", async (req, res) => {
    try {
      const db = await dbPromise;
      const employees = await db.all("SELECT * FROM employees");
      const vacations = await db.all("SELECT * FROM vacations");

      res.json({ employees, vacations });
    } catch (err: any) {
      res.status(500).json({ error: "Помилка експорту JSON: " + err.message });
    }
  });

  // POST /api/import/json - Import Full JSON backup and rebuild DB
  app.post("/api/import/json", async (req, res) => {
    try {
      const { employees, vacations } = req.body;

      if (!Array.isArray(employees) || !Array.isArray(vacations)) {
        return res.status(400).json({ error: "Некоректний формат JSON для імпортування." });
      }

      const db = await dbPromise;

      // Wrap in transaction
      await db.run("BEGIN TRANSACTION");

      try {
        await db.run("DELETE FROM vacations");
        await db.run("DELETE FROM employees");

        for (const emp of employees) {
          await db.run(`
            INSERT INTO employees (id, name, initial, color, main_vacation_limit, additional_vacation_limit, other_vacation_limit)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [emp.id, emp.name, emp.initial, emp.color, emp.main_vacation_limit, emp.additional_vacation_limit, emp.other_vacation_limit]);
        }

        for (const vac of vacations) {
          await db.run(`
            INSERT INTO vacations (id, employee_id, start_date, end_date, type, status)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [vac.id, vac.employee_id, vac.start_date, vac.end_date, vac.type, vac.status]);
        }

        await db.run("COMMIT");
        res.json({ success: true, message: "Дані успішно імпортовано з бекапу!" });
      } catch (innerErr: any) {
        await db.run("ROLLBACK");
        throw innerErr;
      }
    } catch (err: any) {
      res.status(500).json({ error: "Помилка імпортування JSON: " + err.message });
    }
  });

  // --- FRONTEND ROUTING & VITE INTEGRATION ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
