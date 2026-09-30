// src/components/PinInput.jsx
import React, { useState, useRef, useEffect } from 'react'

function PinInput({ length = 6, onComplete, onCancel, title = "Entrez votre code" }) {
  const [pin, setPin] = useState(Array(length).fill(''))
  const [activeIndex, setActiveIndex] = useState(0)
  const inputsRef = useRef([])

  useEffect(() => {
    if (inputsRef.current[0]) {
      inputsRef.current[0].focus()
    }
  }, [])

  const handleChange = (index, value) => {
    if (value.length > 1) {
      value = value[0]
    }
    
    if (!/^\d*$/.test(value)) return
    
    const newPin = [...pin]
    newPin[index] = value
    setPin(newPin)
    
    if (value && index < length - 1) {
      setActiveIndex(index + 1)
      inputsRef.current[index + 1]?.focus()
    }
    
    // Check if complete
    const allFilled = newPin.every(digit => digit !== '')
    if (allFilled) {
      const pinCode = newPin.join('')
      onComplete(pinCode)
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!pin[index] && index > 0) {
        setActiveIndex(index - 1)
        inputsRef.current[index - 1]?.focus()
        const newPin = [...pin]
        newPin[index - 1] = ''
        setPin(newPin)
      } else if (pin[index]) {
        const newPin = [...pin]
        newPin[index] = ''
        setPin(newPin)
      }
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').slice(0, length)
    if (/^\d+$/.test(pastedData)) {
      const newPin = [...pin]
      for (let i = 0; i < pastedData.length; i++) {
        newPin[i] = pastedData[i]
      }
      setPin(newPin)
      
      const allFilled = newPin.every(digit => digit !== '')
      if (allFilled) {
        onComplete(newPin.join(''))
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="card max-w-sm w-full">
        <h3 className="text-white text-xl text-center mb-2">{title}</h3>
        <p className="text-white/50 text-center text-sm mb-6">
          Entrez votre code à {length} chiffres
        </p>
        
        <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
          {pin.map((digit, index) => (
            <input
              key={index}
              ref={el => inputsRef.current[index] = el}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={`w-12 h-12 text-center text-2xl font-bold text-white bg-white/10 border-2 rounded-xl focus:outline-none focus:border-blue-400 transition-all ${
                activeIndex === index ? 'border-blue-400' : 'border-white/20'
              }`}
              autoComplete="off"
            />
          ))}
        </div>
        
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">
            Annuler
          </button>
        </div>
        
        <p className="text-white/30 text-center text-xs mt-4">
          Vous pouvez aussi utiliser votre mot de passe
        </p>
      </div>
    </div>
  )
}

export default PinInput