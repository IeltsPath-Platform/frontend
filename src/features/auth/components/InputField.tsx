import { Eye, EyeOff, Mail, User } from 'lucide-react'
import { useState, type ComponentPropsWithoutRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export type InputFieldIcon = 'user' | 'mail' | 'lock'

interface InputFieldProps extends Omit<ComponentPropsWithoutRef<typeof Input>, 'id' | 'name' | 'type'> {
  id: string
  name: string
  label: string
  type: 'email' | 'password' | 'text'
  hint?: string
  icon?: InputFieldIcon
  requiredMark?: boolean
}

function PadlockIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="auth-input-leading-svg"
    >
      <path
        d="M6.25 7.5V5.833C6.25 3.762 7.929 2.083 10 2.083C12.071 2.083 13.75 3.762 13.75 5.833V7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect x="3.75" y="7.5" width="12.5" height="10" rx="2.75" fill="currentColor" />
      <circle cx="10" cy="12.2" r="1.25" fill="#FFFFFF" />
      <path d="M10 13.1V14.8" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function InputField({
  id,
  name,
  label,
  type,
  hint,
  icon,
  requiredMark = false,
  ...inputProps
}: InputFieldProps) {
  const [isPasswordVisible, setPasswordVisible] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && isPasswordVisible ? 'text' : type
  const hintId = hint ? `${id}-hint` : undefined

  return (
    <div className="auth-input-field">
      <label htmlFor={id} className="auth-input-label">
        <span key={label} className="auth-input-label-text">{label}</span>
        {requiredMark ? (
          <span className="auth-input-required is-visible" aria-hidden="true">
            {' *'}
          </span>
        ) : null}
      </label>
      <div className={`auth-input-control${icon ? ' auth-input-control--with-icon' : ''}`}>
        {icon ? (
          <span className="auth-input-leading-icon" data-icon={icon} aria-hidden="true">
            {icon === 'lock' ? (
              <PadlockIcon />
            ) : (
              <span className="auth-input-icon-morph" data-active-icon={icon}>
                <User className="auth-morph-icon auth-morph-icon--user" size={18} strokeWidth={1.9} />
                <Mail className="auth-morph-icon auth-morph-icon--mail" size={18} strokeWidth={1.9} />
              </span>
            )}
          </span>
        ) : null}
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
            {isPasswordVisible ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
          </Button>
        )}
      </div>
      {hint && <small id={hintId}>{hint}</small>}
    </div>
  )
}
