export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-neutral-500">
          Settings
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900">
          Operational defaults
        </h1>
      </div>

      <div className="space-y-6">
        <section className="rounded-sm border border-neutral-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wider text-neutral-500">
            Delivery fees
          </div>
          <div className="mt-3 grid gap-4 text-sm text-neutral-700 sm:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-wider text-neutral-500">
                Default shipping fee
              </div>
              <input className="input mt-2" value="79 kr" readOnly />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-neutral-500">
                Farm pickup fee
              </div>
              <input className="input mt-2" value="0 kr" readOnly />
            </div>
          </div>
        </section>

        <section className="rounded-sm border border-neutral-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wider text-neutral-500">
            Reminder schedule
          </div>
          <div className="mt-3 space-y-2 text-sm text-neutral-700">
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked />
              Deposit reminder 3 days after order
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked />
              Remainder reminder 2 days before due date
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" />
              Final reminder on due date
            </label>
          </div>
        </section>

        <section className="rounded-sm border border-neutral-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wider text-neutral-500">
            Notification channels
          </div>
          <div className="mt-3 space-y-2 text-sm text-neutral-700">
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked />
              Email
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" />
              SMS
            </label>
          </div>
        </section>

        <section className="rounded-sm border border-neutral-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wider text-neutral-500">
            Vipps environment
          </div>
          <div className="mt-3 text-sm text-neutral-700">
            Current: <span className="font-semibold text-neutral-900">TEST</span>
          </div>
        </section>
      </div>
    </div>
  )
}
