import React, { useEffect, useRef } from 'react';

declare global {
    interface Window {
        adsbygoogle: any;
    }
}

const AdsLeft: React.FC = () => {
    const adRef = useRef<HTMLModElement>(null);

    useEffect(() => {
        // Function to initialize the ad
        const initAd = () => {
            try {
                if (adRef.current && adRef.current.offsetWidth > 0) {
                    const adStatus = adRef.current.getAttribute('data-adsbygoogle-status');
                    // Only push if it hasn't been initialized yet
                    if (!adStatus) {
                        (window.adsbygoogle = window.adsbygoogle || []).push({});
                    }
                }
            } catch (e) {
                console.error('Adsbygoogle error:', e);
            }
        };

        // Delay initialization to ensure layout is ready and width is not 0
        const timer = setTimeout(initAd, 600);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="w-full flex justify-center py-4 bg-transparent min-h-[100px]">
            <ins
                ref={adRef}
                className="adsbygoogle"
                style={{ display: 'block', minWidth: '160px', minHeight: '100px' }}
                data-ad-client="ca-pub-6622430134534219"
                data-ad-slot="4127410556"
                data-ad-format="auto"
                data-full-width-responsive="true"
            ></ins>
        </div>
    );
};

export default AdsLeft;
