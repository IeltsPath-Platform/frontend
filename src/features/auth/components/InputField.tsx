import { Eye, EyeOff } from 'lucide-react'
import { useState, type ComponentPropsWithoutRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface InputFieldProps extends Omit<ComponentPropsWithoutRef<typeof Input>, 'id' | 'name' | 'type'> {
  id: string
  name: string
  label: string
  type: 'email' | 'password'
  hint?: string
}

export function InputField({ id, name, label, type, hint, ...inputProps }: InputFieldProps) {
  const [isPasswordVisible, setPasswordVisible] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && isPasswordVisible ? 'text' : type
  const hintId = hint ? `${id}-hint` : undefined

  return (
    <div className="auth-input-field">
      <label htmlFor={id}>{label}</label>
      <div className="auth-input-control">
        <Input id={id} name={name} type={inputType} aria-describedby={hintId} {...inputProps} />
        {isPassword && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="auth-password-toggle"
            aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
            onClick={() => setPasswordVisible((current) => !current)}
          >
            {isPasswordVisible ? <EyeOff aria-hidden="true" size={19} /> : <Eye aria-hidden="true" size={19} />}
          </Button>
        )}
      </div>
      {hint && <small id={hintId}>{hint}</small>}
    </div>
  )
}
