import React from 'react'
import { DownsectionList } from './DownsectionList'
import PerPic from './PerPic'
const DownSection = () => {
  return (
    <div className="md:flex items-start justify-center gap-5">
      {
        DownsectionList.map((item) => (
          <PerPic key={item.id} title={item.title} description={item.description} imageUrl={item.imageUrl} link={item.link} />
        ))
      }
    </div>
  )
}

export default DownSection
