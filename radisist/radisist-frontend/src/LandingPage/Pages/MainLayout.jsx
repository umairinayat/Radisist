import React from 'react'
import Header from '../Components/Header'
import HeroLayout from './HeroLayout'
import InfiniteBar from '../Components/InfiniteBar'
import MissionLayout from './MissionLayout'

function MainLayout() {
  return (
    <section className='w-full h-screen' >
        <Header />
        <HeroLayout />
        <InfiniteBar />
        <MissionLayout />
    </section>
  )
}

export default MainLayout