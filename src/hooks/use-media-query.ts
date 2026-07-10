<<<<<<< HEAD
"use client"
import { useState, useEffect } from 'react';

export const useMediaQuery = (query: string) => {
    const [value, setValue] = useState(false);

    useEffect(() => {
        function onChange(event: MediaQueryListEvent) {
            setValue(event.matches);
        }

        const result = matchMedia(query);
        result.addEventListener('change', onChange);
        setValue(result.matches);

        return () => result.removeEventListener('change', onChange);
    }, [query]);

    return value;
};
=======
"use client"
import { useState, useEffect } from 'react';

export const useMediaQuery = (query: string) => {
    const [value, setValue] = useState(false);

    useEffect(() => {
        function onChange(event: MediaQueryListEvent) {
            setValue(event.matches);
        }

        const result = matchMedia(query);
        result.addEventListener('change', onChange);
        setValue(result.matches);

        return () => result.removeEventListener('change', onChange);
    }, [query]);

    return value;
};
>>>>>>> 8c2f2c7ee9c25fe21fb0f2e265f70b5d1d4e553a
