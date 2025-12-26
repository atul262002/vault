import React from 'react'
import { GridBackground } from './grids'
import { Features } from './features'
import Title from './title'
import { SpotlightNewDemo } from './spotlight'
import { FeaturesSectionDemo } from './featureSelection'
import { InfiniteMovingCardsDemo } from './testimonials'
import ContactSection from './contact'

const Landing = () => {
    return (
        <div>
            <SpotlightNewDemo>
                <GridBackground>
                    <Title />
                </GridBackground>
            </SpotlightNewDemo>
            <Features />
            <FeaturesSectionDemo />
            <InfiniteMovingCardsDemo />
            <ContactSection />
        </div>
    )
}

export default Landing