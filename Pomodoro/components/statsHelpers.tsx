import dayjs from 'dayjs';
import { increment, ref, update } from 'firebase/database';
import { db } from '../firebaseConfig';

export async function recordStats(userId: string, minutes: number) {
  const dateKey = dayjs().format('YYYY-MM-DD');
  const statsRef = ref(db, `stats/${userId}/${dateKey}`);
  await update(statsRef, {
    pomodorosCompleted: increment(1),
    minutesWorked: increment(minutes),
  });
}
