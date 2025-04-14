import React, { useState } from 'react'
import { GoSun } from "react-icons/go"
import { BsMoon } from "react-icons/bs"

const Toggler = () => {
  const [isChecked, setIsChecked] = useState(false)

  const handleCheckboxChange = () => {
    setIsChecked(!isChecked)
  }

  return (
    <>
      <label className='autoSaverSwitch relative inline-flex cursor-pointer select-none items-center text-xl'>
        <input
          type='checkbox'
          name='autoSaver'
          className='sr-only'
          checked={isChecked}
          onChange={handleCheckboxChange}
        />
        <span
          className={`slider mr-3 flex h-[26px] w-[50px] items-center rounded-full p-1 duration-200 ${
            isChecked ? 'bg-black' : 'bg-[#CCCCCE]'
          }`}
        >
          <span
            className={`dot flex items-center justify-center h-[18px] w-[18px] rounded-full bg-white duration-200 ${
              isChecked ? 'translate-x-6' : ''
            }`}
          >
            {isChecked ? (
              <BsMoon className='text-black text-[12px]' />
            ) : (
              <GoSun className='text-yellow-500 text-[12px]' />
            )}
          </span>
        </span>
        <span className='label flex items-center text-xl font-medium text-black'>
           <span className='pl-1'> {isChecked ? 'Dark' : 'Light'} </span>
        </span>
      </label>
    </>
  )
}

export default Toggler
