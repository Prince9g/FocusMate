import React from 'react'
import { NavList } from './NavList';
import Toggler from './Toggler';
import { useNavigate } from 'react-router-dom';
const Navbar = () => {
  const navigate = useNavigate();
  const onClickHandler = (link) => {
    navigate(`/${link}`);
  }
  return (
    <div className="m-5">
        <div className="flex items-center justify-evenly text-xl">
        {/* logo  */}
        <div className="border-2 rounded-xl bg-red-300 shadow-md p-2 ">FocusMate</div>
        {/* Navlist  */}
        <div className="w-1/2 flex items-center justify-end gap-16">
        {
            NavList.map((item)=>{
                return <div className="hover:text-purple-400 cursor-pointer" key={item.id} onClick={() => onClickHandler(item.link)}>{item.name}</div>
            })
        }
        </div>
        {/* toggler of light and dark mode  */}
        <div>
            <Toggler/>
        </div>
    </div>
    </div>
  )
}

export default Navbar
