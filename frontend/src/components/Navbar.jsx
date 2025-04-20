import React, { use, useState } from 'react'
import { NavList } from './NavList';
import Toggler from './Toggler';
import { IoMdMenu } from "react-icons/io";
import { VscClose } from "react-icons/vsc";
import { useNavigate } from 'react-router-dom';
import ResponsiveNav from './ResponsiveNav';
const Navbar = () => {
  const navigate = useNavigate();
  const onClickHandler = (link) => {
    navigate(`/${link}`);
  }
  const [open, setOpen] = useState(false);
  return (
    <div className="m-2 md:m-5 dark:text-white border-b-2 border-gray-200 dark:border-gray-800 dark:bg-slate-800 bg-slate-100 rounded-3xl shadow-md p-2">
        <div className="flex flex-row-reverse md:flex-row md:flex items-center justify-between md:justify-evenly text-xl">
        <div className="md:hidden">
            <Toggler/>
        </div>
        {/* logo  */}
        <div className="text-white font-semibold border-2 ml-4 md:ml-0 rounded-xl bg-red-300 shadow-lg p-3">FocusMate</div>
        {/* Navlist  */}
        <div className="hidden w-1/2 md:flex items-center justify-end gap-16">
        {
            NavList.map((item)=>{
                return <div className="hover:text-purple-400 cursor-pointer" key={item.id} onClick={() => onClickHandler(item.link)}>{item.name}</div>
            })
        }
        </div>
        {/* toggler of light and dark mode  */}
        <div className="hidden md:block">
            <Toggler/>
        </div>
            {/* Hamburger Section */}
            <div className="md:hidden" onClick={()=>{
                setOpen(!open)
            }}>
                {open ? <VscClose className="text-4xl"/> : <IoMdMenu className="text-4xl"/>}
            </div>
        </div>
    {/*mobile sidebar section */}
    <ResponsiveNav open={open} setOpen={setOpen}/>
    </div>
  )
}

export default Navbar
