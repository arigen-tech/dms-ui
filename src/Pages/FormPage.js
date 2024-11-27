import React from 'react'
import Sidebar from '../Components/Sidebar'
import Header from '../Components/Header'
import FormData from '../Data/FormData'

function FormPage() {
  return (
    <div className='flex flex-row bg-neutral-100 h-screen w-screen overflow-hidden'>
        <Sidebar />
        <div className='flex flex-col flex-1'>
            <div><Header /></div>
            <div className='flex-1 p-4 min-h-0 overflow-auto'><FormData /></div>
        </div>
    </div>
  )
}

export default FormPage