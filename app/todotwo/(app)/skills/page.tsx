import { ClaimSkillControl } from '@/components/todotwo/skills/claim-skill-control'
import { VerifySkillControl } from '@/components/todotwo/skills/verify-skill-control'
import { Surface, EmptyState } from '@/components/todotwo/ui/states'
import { requireTodoTwoUser } from '@/lib/todotwo/auth'
import {
  getAllPersonSkills,
  getPeople,
  getPersonSkills,
  getSkills,
  type PersonSkillRow,
} from '@/lib/todotwo/queries'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'
import { Wrench } from 'lucide-react'

export const dynamic = 'force-dynamic'

const STAFF_ROLES = ['super_admin', 'farm_admin', 'coordinator']

const LEVEL_LABEL: Record<string, string> = {
  novice: 'Novice',
  competent: 'Competent',
  proficient: 'Proficient',
  expert: 'Expert',
}

function byId<T extends { id: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map((r) => [r.id, r]))
}

export default async function SkillsPage() {
  const principal = await requireTodoTwoUser(`${TODOTWO_BASE}/skills`)
  const isStaff = principal.roles.some((role) => STAFF_ROLES.includes(role))

  const skills = await getSkills()

  if (skills.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <h1 className="text-2xl">Skills</h1>
        <EmptyState icon={Wrench} title="No skills in the catalogue yet" />
      </div>
    )
  }

  const categories = Array.from(new Set(skills.map((s) => s.category)))

  if (!isStaff) {
    const mine = await getPersonSkills(principal.person.id)
    const claimed = new Map(mine.map((row) => [row.skill_id, row]))

    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl">Skills</h1>
          <p className="text-sm text-[var(--tt-ink-2)]">
            Claim what you can do. Staff verify it separately — a claim on its own is not a
            verification.
          </p>
        </header>

        {categories.map((category) => (
          <div key={category} className="flex flex-col gap-2">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
              {category}
            </h2>
            <Surface className="px-4">
              <ul className="list-none">
                {skills
                  .filter((s) => s.category === category)
                  .map((skill) => {
                    const mineRow = claimed.get(skill.id)
                    return (
                      <li
                        key={skill.id}
                        className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-[var(--tt-rule)] py-3 last:border-b-0"
                      >
                        <div className="min-w-0">
                          <p className="text-[15px]">{skill.name}</p>
                          {skill.description ? (
                            <p className="truncate text-[13px] text-[var(--tt-ink-3)]">
                              {skill.description}
                            </p>
                          ) : null}
                          {mineRow?.admin_verified_level ? (
                            <p className="text-[12px] text-[var(--tt-accent)]">
                              Verified: {LEVEL_LABEL[mineRow.admin_verified_level] ?? mineRow.admin_verified_level}
                              {mineRow.authorized_unsupervised ? ' · authorized unsupervised' : ''}
                            </p>
                          ) : null}
                        </div>

                        <ClaimSkillControl
                          skillId={skill.id}
                          claimedLevel={mineRow?.claimed_level ?? null}
                        />
                      </li>
                    )
                  })}
              </ul>
            </Surface>
          </div>
        ))}
      </div>
    )
  }

  // Staff view: every person's skills, with a verification control per row.
  const [people, allSkillRows] = await Promise.all([getPeople(), getAllPersonSkills()])
  const skillById = byId(skills)
  const peopleWithClaims = people.filter((person) =>
    allSkillRows.some((row) => row.person_id === person.id)
  )
  const rowsByPerson = new Map<string, PersonSkillRow[]>()
  for (const row of allSkillRows) {
    const list = rowsByPerson.get(row.person_id)
    if (list) list.push(row)
    else rowsByPerson.set(row.person_id, [row])
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl">Skills</h1>
        <p className="text-sm text-[var(--tt-ink-2)]">
          Verify claimed skills and authorize unsupervised work. Only staff can set these — a
          person cannot verify their own claim.
        </p>
      </header>

      {peopleWithClaims.length === 0 ? (
        <EmptyState icon={Wrench} title="No one has claimed a skill yet" />
      ) : (
        peopleWithClaims.map((person) => {
          const rows = rowsByPerson.get(person.id) ?? []
          return (
            <div key={person.id} className="flex flex-col gap-2">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
                {person.preferred_name || person.full_name}
              </h2>
              <Surface className="px-4">
                <ul className="list-none">
                  {rows.map((row) => {
                    const skill = skillById.get(row.skill_id)
                    if (!skill) return null
                    return (
                      <li
                        key={row.id}
                        className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-[var(--tt-rule)] py-3 last:border-b-0"
                      >
                        <div className="min-w-0">
                          <p className="text-[15px]">{skill.name}</p>
                          <p className="text-[13px] text-[var(--tt-ink-3)]">
                            Claimed: {row.claimed_level ? LEVEL_LABEL[row.claimed_level] : 'Not claimed'}
                          </p>
                        </div>

                        <VerifySkillControl
                          personId={person.id}
                          skillId={row.skill_id}
                          verifiedLevel={row.admin_verified_level}
                          authorizedUnsupervised={row.authorized_unsupervised}
                        />
                      </li>
                    )
                  })}
                </ul>
              </Surface>
            </div>
          )
        })
      )}
    </div>
  )
}
