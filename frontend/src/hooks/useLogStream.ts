import { useEffect, useState, useCallback } from "react";

/* ─── Types ─── */
export type LogLevel = "INFO" | "WARN" | "ERROR" | "CRITICAL";
export type LogSource = "Wazuh" | "DefectDojo" | "Redmine" | "System";

export interface LogEntry {
  id: string;
  time: string;
  source: LogSource;
  level: LogLevel;
  message: string;
  isNew?: boolean;
}

/* ─── Real-Time Hook ─── */
export function useLogStream(paused: boolean, maxLogs = 500) {
  // เริ่มต้นด้วยอาเรย์ว่าง เพื่อไม่ให้มีข้อมูลสมมุติค้างอยู่
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // ฟังก์ชันสำหรับเพิ่ม Log (ใช้เรียกเมื่อได้รับข้อมูลจริงจาก WebSocket/API)
  const addLog = useCallback((entry: LogEntry) => {
    setLogs((prev) => {
      const next = [{ ...entry, isNew: true }, ...prev].slice(0, maxLogs);
      
      // ลบสถานะ isNew หลังจากแสดงผล 1.5 วินาที
      setTimeout(() => {
        setLogs((p) => p.map((l) => (l.id === entry.id ? { ...l, isNew: false } : l)));
      }, 1500);
      
      return next;
    });
  }, [maxLogs]);

  /**
   * [TODO] เชื่อมต่อข้อมูลจริงจาก Backend
   * คุณสามารถใช้ useEffect นี้เชื่อมต่อกับ WebSocket จริงได้ที่นี่
   */
  useEffect(() => {
    if (paused) return;

    /* 
    // ตัวอย่างการเชื่อมต่อ WebSocket จริง:
    const ws = new WebSocket("ws://localhost:8000/ws/logs");
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      addLog({
        id: `${Date.now()}-${Math.random()}`,
        time: new Date().toTimeString().split(" ")[0],
        source: data.source,
        level: data.level,
        message: data.message
      });
    };

    return () => ws.close();
    */
    
    // หมายเหตุ: ผมได้เอา setInterval (ตัวสุ่มข้อมูลสมมุติ) ออกไปแล้ว
    // ข้อมูลจะไม่ไหลจนกว่าจะมีการเรียกใช้ฟังก์ชัน addLog จากแหล่งข้อมูลจริง
  }, [paused, addLog]);

  const clear = () => setLogs([]);

  return { logs, addLog, clear };
}
