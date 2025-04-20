import React, { useEffect, useState } from 'react'
import { GoSun } from "react-icons/go"
import { BsMoon } from "react-icons/bs"

const Toggler = () => {
  const [isChecked, setIsChecked] = useState(false)
  
  useEffect(()=>{
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
      setIsChecked(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsChecked(false);
      document.documentElement.classList.remove('dark');
    }
  },[isChecked])
  const handleCheckboxChange = () => {
    setIsChecked(!isChecked)
    localStorage.setItem('theme', !isChecked ? 'dark' : 'light');

    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

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
          className={`slider md:mr-3 flex h-[26px] w-[50px] items-center rounded-full p-1 duration-200 ${
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
           <span className='hidden md:block pl-1'> {isChecked ? 'Dark' : 'Light'} </span>
        </span>
      </label>
    </>
  )
}

export default Toggler
