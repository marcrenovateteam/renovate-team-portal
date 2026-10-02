export const JOB_TASK_TYPES = ["Administrative", "Appliance Install", "Cleaning", "Concrete", "Demolition", "Dirt Work", "Drywall", "Exterior Carpentry", "Finish Carpentry", "Flooring", "Frame Carpentry", "Hardware Install", "Insulation", "Landscaping", "Masonry", "Painting", "Roofing", "Tile", "Utilities"] as const;

export function billingForTask(task:string){return task==="Administrative"?"non-billable":"billable";}
