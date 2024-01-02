import type { JSX } from 'preact'
import { useState } from 'react'

type CheckboxOption = {
  [key: string]: boolean | CheckboxOption
}

const isCheckboxOptionChecked = (value: boolean | CheckboxOption): boolean => {
  if (typeof value === 'boolean') {
    return value
  }

  return Object.keys(value).every((key: string) =>
    isCheckboxOptionChecked(value[key] as CheckboxOption),
  )
}

const toggleCheckboxOption = (
  parent: CheckboxOption,
  key: string,
  checked: boolean,
): CheckboxOption => {
  const currentValue = parent[key]

  if (typeof currentValue === 'boolean') {
    parent[key] = checked
  } else {
    Object.keys(currentValue).forEach((key) => {
      toggleCheckboxOption(currentValue, key, checked)
    })
  }

  return parent
}

const NestedCheckbox = ({
  value,
  onChange,
}: {
  value: CheckboxOption
  onChange: (value: CheckboxOption) => void
}) => {
  const refresh = () => onChange(structuredClone(value))

  return (
    <ol className="list-none">
      {Object.entries(value).map(([key, val]) => (
        <li key={key}>
          <label>
            <input
              type="checkbox"
              name={key}
              checked={isCheckboxOptionChecked(val)}
              onChange={(event: JSX.TargetedEvent<HTMLInputElement>) => {
                toggleCheckboxOption(
                  value,
                  key,
                  (event.target as HTMLInputElement).checked,
                )

                refresh()
              }}
            />
            &nbsp;
            {key}
          </label>

          {typeof val === 'object' && (
            <NestedCheckbox value={val} onChange={refresh} />
          )}
        </li>
      ))}
    </ol>
  )
}

const App = () => {
  const [value, onChange] = useState<CheckboxOption>({
    foo: true,
    bar: false,
    group1: {
      level2: true,
      level2option2: false,
      nested: {
        option: true,
      },
    },
  })

  return (
    <>
      <NestedCheckbox value={value} onChange={onChange} />
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </>
  )
}

export default App
