export const CALM_CATEGORIES = [
    {
        title: 'Seizure Ceased',
        color: '#4ade80', // Green
        options: [
            { key: 'seizure_stopped', label: 'calmOptionSeizureStopped' }
        ]
    },
    {
        title: 'Sensory and Comfort',
        color: '#60a5fa', // Blue
        options: [
            { key: 'drink_food', label: 'calmOptionHydration' },
            { key: 'snack', label: 'calmOptionSnack' },
            { key: 'diaper', label: 'calmOptionHygiene' },
            { key: 'clothing', label: 'calmOptionClothing' }
        ]
    },
    {
        title: 'Pressure and Proprioception',
        color: '#a78bfa', // Purple
        options: [
            { key: 'deep_pressure', label: 'calmOptionDeepPressure' },
            { key: 'joint_compressions', label: 'calmOptionJointCompressions' },
            { key: 'bear_hugs', label: 'calmOptionBearHugs' }
        ]
    },
    {
        title: 'Vestibular (Movement) Input',
        color: '#fb923c', // Orange
        options: [
            { key: 'swinging', label: 'calmOptionSwinging' },
            { key: 'rocking', label: 'calmOptionRocking' },
            { key: 'heavy_work', label: 'calmOptionHeavyWork' }
        ]
    },
    {
        title: 'Environ & Hydrotherapy',
        color: '#2dd4bf', // Teal
        options: [
            { key: 'shower_bath', label: 'calmOptionShowerBath' },
            { key: 'reduced_stimulation', label: 'calmOptionReducedStimulation' },
            { key: 'visual_calming', label: 'calmOptionVisualCalming' }
        ]
    },
    {
        title: 'Other',
        color: '#9ca3af', // Gray
        options: [
            { key: 'meds', label: 'calmOptionMeds' },
            { key: 'time', label: 'calmOptionTime' },
            { key: 'comfort', label: 'calmOptionComfort' },
            { key: 'other', label: 'calmOptionOther' }
        ]
    }
];

export const getCategoryForCalmKey = (key: string) => {
    for (const cat of CALM_CATEGORIES) {
        if (cat.options.some(o => o.key === key)) return cat;
    }
    // Fallback to "Other"
    return CALM_CATEGORIES[CALM_CATEGORIES.length - 1];
};

export const getCalmLabel = (key: string, i18nTranslator: any) => {
    for (const cat of CALM_CATEGORIES) {
        const opt = cat.options.find(o => o.key === key);
        if (opt) return i18nTranslator(opt.label);
    }
    return i18nTranslator('calmedByLabel'); // Fallback
};
