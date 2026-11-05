import type { Metric, WorkoutSet } from '@/lib/db'
import { SetList } from '@/components/Workout/SetList'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

const set = (id: string, reps: number | null, weight: number | null): WorkoutSet => ({
  id,
  reps,
  weight,
  band: null,
  timeSec: null,
  distance: null,
  calories: null,
})

function Harness({
  initial,
  metrics = ['reps', 'weight'],
  editable = true,
  single,
}: {
  initial: WorkoutSet[]
  metrics?: Metric[]
  editable?: boolean
  single?: string
}) {
  const [sets, setSets] = useState(initial)
  return <SetList sets={sets} metrics={metrics} editable={editable} single={single} onChange={setSets} />
}

const identical = () => [set('a', 10, 16), set('b', 10, 16), set('c', 10, 16)]

describe('SetList', () => {
  it('lists every set as its own numbered row with hidden inputs', () => {
    render(<Harness initial={identical()} />)

    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getAllByText('10 повт. · 16 кг')).toHaveLength(3)
    expect(screen.getAllByRole('button', { name: /Изменить подход/ })).toHaveLength(3)
    expect(screen.getAllByRole('button', { name: /Удалить подход/ })).toHaveLength(3)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('opens the inputs of one set only after its pencil is pressed', async () => {
    const user = userEvent.setup()
    render(<Harness initial={identical()} />)

    await user.click(screen.getByRole('button', { name: 'Изменить подход 2' }))

    expect(screen.getByLabelText('Повторения, подход 2')).toHaveValue('10')
    expect(screen.getByLabelText('Повторения, подход 2')).toHaveFocus()
    expect(screen.queryByLabelText('Повторения, подход 1')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Повторения, подход 3')).not.toBeInTheDocument()
  })

  it('saves the edit and hides the inputs again on done', async () => {
    const user = userEvent.setup()
    render(<Harness initial={identical()} />)

    await user.click(screen.getByRole('button', { name: 'Изменить подход 2' }))
    const reps = screen.getByLabelText('Повторения, подход 2')
    await user.clear(reps)
    await user.type(reps, '12')
    await user.click(screen.getByRole('button', { name: 'Готово, подход 2' }))

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByText('12 повт. · 16 кг')).toBeInTheDocument()
    expect(screen.getAllByText('10 повт. · 16 кг')).toHaveLength(2)
  })

  it('adds a set copied from the last one and opens it for editing', async () => {
    const user = userEvent.setup()
    render(<Harness initial={[set('a', 8, 20), set('b', 10, 16)]} />)

    await user.click(screen.getByRole('button', { name: 'Подход' }))

    expect(screen.getByLabelText('Повторения, подход 3')).toHaveValue('10')
    expect(screen.getByLabelText('Вес, кг, подход 3')).toHaveValue('16')
    expect(screen.getByLabelText('Повторения, подход 3')).toHaveFocus()
  })

  it('starts from an empty row when there are no sets yet', async () => {
    const user = userEvent.setup()
    render(<Harness initial={[]} />)

    expect(screen.queryByRole('button', { name: /Изменить подход/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Подход' }))

    expect(screen.getByLabelText('Повторения, подход 1')).toHaveValue('')
    expect(screen.getByLabelText('Вес, кг, подход 1')).toHaveValue('')
  })

  it('shows a placeholder for a set without values', () => {
    render(<Harness initial={[set('a', null, null)]} />)

    expect(screen.getByText('Не задано')).toBeInTheDocument()
  })

  it('renumbers the remaining sets after removing one', async () => {
    const user = userEvent.setup()
    render(<Harness initial={[set('a', 5, 10), set('b', 6, 11), set('c', 7, 12)]} />)

    await user.click(screen.getByRole('button', { name: 'Удалить подход 2' }))

    expect(screen.getAllByRole('button', { name: /Удалить подход/ })).toHaveLength(2)
    expect(screen.getByText('5 повт. · 10 кг')).toBeInTheDocument()
    expect(screen.queryByText('6 повт. · 11 кг')).not.toBeInTheDocument()
    expect(screen.getByText('7 повт. · 12 кг')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.queryByText('3')).not.toBeInTheDocument()
  })

  it('changes the resistance band of one set through a select', async () => {
    const user = userEvent.setup()
    const a = { ...set('a', 10, null), band: 'Жёлтая' }
    const b = { ...set('b', 10, null), band: 'Жёлтая' }
    render(<Harness initial={[a, b]} metrics={['reps', 'band']} />)

    await user.click(screen.getByRole('button', { name: 'Изменить подход 2' }))
    await user.selectOptions(screen.getByLabelText('Резина, подход 2'), 'Красная')
    await user.click(screen.getByRole('button', { name: 'Готово, подход 2' }))

    expect(screen.getByText('10 повт. · резина жёлтая')).toBeInTheDocument()
    expect(screen.getByText('10 повт. · резина красная')).toBeInTheDocument()
  })

  it('keeps the compact grouped summary in read-only mode', () => {
    render(<Harness initial={identical()} editable={false} />)

    expect(screen.getByText('3 × 10 повт. · 16 кг')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders one unnumbered row for a circuit prescription', async () => {
    const user = userEvent.setup()
    render(<Harness initial={[set('a', 12, null)]} metrics={['reps']} single="За раунд" />)

    expect(screen.getByText('За раунд')).toBeInTheDocument()
    expect(screen.getByText('12 повт.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /подход/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Изменить' }))
    expect(screen.getByLabelText('Повторения')).toHaveValue('12')
  })
})
