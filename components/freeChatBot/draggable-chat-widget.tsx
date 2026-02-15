"use client";
import React, { useEffect, useState } from "react";
import Script from "next/script";
import Draggable from "react-draggable"; // npm install react-draggable
import { MessageCircle } from "lucide-react";

export default function DraggableChatWidget() {
    const [isLoaded, setIsLoaded] = useState(false);
    const nodeRef = React.useRef(null);

    useEffect(() => {
        // Function to check and hide default widget
        const checkTawk = () => {
            if ((window as any).Tawk_API) {
                // Callback when Tawk is loaded
                (window as any).Tawk_API.onLoad = function () {
                    (window as any).Tawk_API.hideWidget();
                    setIsLoaded(true);
                };

                // If already loaded (e.g. navigation)
                if ((window as any).Tawk_API.bind) { // Check for a method that exists
                    (window as any).Tawk_API.hideWidget();
                    setIsLoaded(true);
                }
            }
        };

        // Check periodically in case script loads slowly
        const interval = setInterval(checkTawk, 500);

        // Also try immediately
        checkTawk();

        return () => clearInterval(interval);
    }, []);

    const toggleChat = () => {
        if ((window as any).Tawk_API) {
            (window as any).Tawk_API.toggle();
        }
    };

    return (
        <>
            <Script
                id="tawk-to-script"
                strategy="lazyOnload"
                dangerouslySetInnerHTML={{
                    __html: `
            var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
            (function(){
              var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
              s1.async=true;
              s1.src='https://embed.tawk.to/69484854420bc819787efdaa/1jd15l3fv';
              s1.charset='UTF-8';
              s1.setAttribute('crossorigin','*');
              s0.parentNode.insertBefore(s1,s0);
            })();
          `,
                }}
            />

            {/* Custom Draggable Launcher */}
            {/* We use a fixed container, but Draggable will transform it. 
          Use 'fixed' position for the starting point. */}
            {isLoaded && (
                <Draggable nodeRef={nodeRef}>
                    <div
                        ref={nodeRef}
                        className="fixed bottom-6 right-6 z-[9999] cursor-move shadow-xl rounded-full transition-transform hover:scale-105 active:scale-95"
                        style={{ touchAction: 'none' }} // Prevent scrolling while dragging on touch devices
                    >
                        <div
                            onClick={toggleChat}
                            className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors"
                        >
                            <MessageCircle size={32} />
                        </div>
                    </div>
                </Draggable>
            )}
        </>
    );
}
