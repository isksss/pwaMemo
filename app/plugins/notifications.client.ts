export default defineNuxtPlugin(() => {
  const check = async () => {
    const due = await useDataService().dueReminders()
    for (const { reminder, task } of due) {
      try {
        if (Notification.permission === 'granted') {
          const registration = await navigator.serviceWorker.ready
          await registration.showNotification(task.title, {
            body: task.dueAt ? `期限: ${new Date(task.dueAt).toLocaleString('ja-JP')}` : 'タスクの期限です',
            tag: `task-${task.id}-${reminder.offsetMinutes}`,
            icon: '/icons/icon-192.svg',
            data: { url: '/tasks' },
          })
        }
      } finally {
        await useDataService().markReminderSent(reminder.id)
      }
    }
  }
  onNuxtReady(async () => {
    await check()
    window.setInterval(check, 60_000)
    navigator.serviceWorker?.addEventListener('message', (event) => {
      if (event.data?.type === 'CHECK_REMINDERS') void check()
    })
    try {
      const registration = await navigator.serviceWorker?.ready
      await (registration as any)?.periodicSync?.register('pwa-memo-reminders', { minInterval: 15 * 60 * 1000 })
    } catch {
      /* ブラウザ判断で拒否される */
    }
  })
})
