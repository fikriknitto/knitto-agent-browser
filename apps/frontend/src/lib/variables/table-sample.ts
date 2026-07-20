// Sample data constants to replace faker.js
// This file contains all the sample data needed for the Knitto table component examples

// ============================================================================
// TYPES
// ============================================================================

export type User = {
  id: number;
  name: string;
  email: string;
  username: string;
  phone: string;
  company: string;
  jobTitle: string;
  city: string;
  country: string;
  status: string;
  salary: string;
  department: string;
  joinDate: string;
  experience: number;
  address: string;
  skills: string[];
  position: string;
};

export type Employee = {
  id: number;
  name: string;
  email: string;
  company: string;
  position: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  salary: number;
  status: string;
  joinDate: string;
  performance: number;
  department: string;
  skills: string[];
};

export type EmployeeWithDetails = {
  id: number;
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  salary: number;
  startDate: string;
  performance: number;
  manager: string;
  location: string;
  skills: string[];
};

export type EmployeeData = {
  id: number;
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  salary: number;
  startDate: string;
  performance: number;
  manager: string;
  location: string;
  country: string;
  skills: string[];
  projects: number;
  experience: number;
  status: string;
  lastLogin: string;
};

export type SampleData = {
  id: number;
  product: string;
  category: string;
  quantity: number;
  unitPrice: number;
  total: number;
  discount: number;
  finalAmount: number;
  status: string;
  region: string;
  salesRep: string;
};

export type SalesData = {
  id: number;
  product: string;
  category: string;
  q1Sales: number;
  q2Sales: number;
  q3Sales: number;
  q4Sales: number;
  totalSales: number;
  profit: number;
  margin: number;
  region: string;
  salesRep: string;
};

export type Product = {
  id: number;
  name: string;
  category: string;
  price: string;
  description: string;
  features: string[];
  status: string;
  stock: number;
  sku: string;
  manufacturer: string;
  lastUpdated: string;
};

export type Company = {
  id: number;
  name: string;
  industry: string;
  revenue: number;
  employees: number;
  founded: number;
  ceo: string;
  headquarters: string;
  departments: Department[];
};

export type Department = {
  id: number;
  name: string;
  manager: string;
  employees: number;
  budget: number;
  teams: Team[];
};

export type Team = {
  id: number;
  name: string;
  lead: string;
  members: number;
  projects: number;
  status: string;
};

export type Project = {
  id: number;
  name: string;
  status: string;
  progress: number;
};

// ============================================================================
// SAMPLE DATA ARRAYS
// ============================================================================

export const SAMPLE_NAMES = [
  'John Smith',
  'Sarah Johnson',
  'Michael Brown',
  'Emily Davis',
  'David Wilson',
  'Lisa Anderson',
  'Robert Taylor',
  'Jennifer Thomas',
  'William Jackson',
  'Maria Garcia',
  'James Martinez',
  'Linda Rodriguez',
  'Christopher Lee',
  'Barbara White',
  'Daniel Harris',
  'Susan Martin',
  'Matthew Thompson',
  'Jessica Garcia',
  'Anthony Martinez',
  'Ashley Robinson',
  'Mark Clark',
  'Amanda Rodriguez',
  'Donald Lewis',
  'Stephanie Lee',
  'Paul Walker',
  'Laura Hall',
  'Steven Allen',
  'Donna Young',
  'Kevin King',
  'Carol Wright',
  'Brian Lopez',
  'Ruth Hill',
  'George Scott',
  'Sharon Green',
  'Edward Adams',
  'Michelle Baker',
  'Ronald Gonzalez',
  'Laura Nelson',
  'Timothy Carter',
  'Helen Mitchell',
  'Jason Perez',
  'Deborah Roberts',
  'Jeffrey Turner',
  'Dorothy Phillips',
  'Ryan Campbell',
  'Betty Parker',
  'Jacob Evans',
  'Sandra Edwards',
  'Gary Collins',
  'Donna Stewart',
];

export const SAMPLE_EMAILS = [
  'john.smith@email.com',
  'sarah.johnson@email.com',
  'michael.brown@email.com',
  'emily.davis@email.com',
  'david.wilson@email.com',
  'lisa.anderson@email.com',
  'robert.taylor@email.com',
  'jennifer.thomas@email.com',
  'william.jackson@email.com',
  'maria.garcia@email.com',
  'james.martinez@email.com',
  'linda.rodriguez@email.com',
  'christopher.lee@email.com',
  'barbara.white@email.com',
  'daniel.harris@email.com',
  'susan.martin@email.com',
  'matthew.thompson@email.com',
  'jessica.garcia@email.com',
  'anthony.martinez@email.com',
  'ashley.robinson@email.com',
  'mark.clark@email.com',
  'amanda.rodriguez@email.com',
  'donald.lewis@email.com',
  'stephanie.lee@email.com',
  'paul.walker@email.com',
  'laura.hall@email.com',
  'steven.allen@email.com',
  'donna.young@email.com',
  'kevin.king@email.com',
  'carol.wright@email.com',
];

export const SAMPLE_USERNAMES = [
  'jsmith',
  'sjohnson',
  'mbrown',
  'edavis',
  'dwilson',
  'landerson',
  'rtaylor',
  'jthomas',
  'wjackson',
  'mgarcia',
  'jmartinez',
  'lrodriguez',
  'clee',
  'bwhite',
  'dharris',
  'smartin',
  'mthompson',
  'jgarcia',
  'amartinez',
  'arobinson',
  'mclark',
  'arodriguez',
  'dlewis',
  'slee',
  'pwalker',
  'lhall',
  'sallen',
  'dyoung',
  'kking',
  'cwright',
];

export const SAMPLE_PHONES = [
  '+1-555-0101',
  '+1-555-0102',
  '+1-555-0103',
  '+1-555-0104',
  '+1-555-0105',
  '+1-555-0106',
  '+1-555-0107',
  '+1-555-0108',
  '+1-555-0109',
  '+1-555-0110',
  '+1-555-0111',
  '+1-555-0112',
  '+1-555-0113',
  '+1-555-0114',
  '+1-555-0115',
  '+1-555-0116',
  '+1-555-0117',
  '+1-555-0118',
  '+1-555-0119',
  '+1-555-0120',
  '+1-555-0121',
  '+1-555-0122',
  '+1-555-0123',
  '+1-555-0124',
  '+1-555-0125',
  '+1-555-0126',
  '+1-555-0127',
  '+1-555-0128',
  '+1-555-0129',
  '+1-555-0130',
];

export const SAMPLE_COMPANIES = [
  'TechCorp Solutions',
  'InnovateLab Inc',
  'DataFlow Systems',
  'CloudTech Industries',
  'Digital Dynamics',
  'NextGen Technologies',
  'SmartSoft Solutions',
  'FutureWorks Corp',
  'CyberNet Systems',
  'Quantum Innovations',
  'AlphaTech Group',
  'Beta Solutions',
  'Gamma Industries',
  'Delta Technologies',
  'Epsilon Systems',
  'Zeta Corp',
  'Eta Innovations',
  'Theta Solutions',
  'Iota Technologies',
  'Kappa Systems',
  'Lambda Corp',
  'Mu Innovations',
  'Nu Solutions',
  'Xi Technologies',
  'Omicron Systems',
  'Pi Corp',
  'Rho Innovations',
  'Sigma Solutions',
  'Tau Technologies',
  'Upsilon Systems',
];

export const SAMPLE_JOB_TITLES = [
  'Software Engineer',
  'Senior Developer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'DevOps Engineer',
  'Data Scientist',
  'Product Manager',
  'UI/UX Designer',
  'QA Engineer',
  'System Administrator',
  'Database Administrator',
  'Technical Lead',
  'Architect',
  'Scrum Master',
  'Business Analyst',
  'Marketing Manager',
  'Sales Representative',
  'HR Specialist',
  'Financial Analyst',
  'Operations Manager',
  'Project Manager',
  'Content Writer',
  'Graphic Designer',
  'Network Engineer',
  'Security Analyst',
  'Cloud Engineer',
  'Mobile Developer',
  'Machine Learning Engineer',
  'Research Scientist',
];

export const SAMPLE_CITIES = [
  'New York',
  'Los Angeles',
  'Chicago',
  'Houston',
  'Phoenix',
  'Philadelphia',
  'San Antonio',
  'San Diego',
  'Dallas',
  'San Jose',
  'Austin',
  'Jacksonville',
  'Fort Worth',
  'Columbus',
  'Charlotte',
  'San Francisco',
  'Indianapolis',
  'Seattle',
  'Denver',
  'Washington',
  'Boston',
  'El Paso',
  'Nashville',
  'Detroit',
  'Oklahoma City',
  'Portland',
  'Las Vegas',
  'Memphis',
  'Louisville',
];

export const SAMPLE_COUNTRIES = [
  'United States',
  'Canada',
  'United Kingdom',
  'Germany',
  'France',
  'Italy',
  'Spain',
  'Netherlands',
  'Sweden',
  'Norway',
  'Denmark',
  'Finland',
  'Australia',
  'Japan',
  'South Korea',
  'Singapore',
  'India',
  'Brazil',
  'Mexico',
  'Argentina',
  'Chile',
  'South Africa',
  'Nigeria',
  'Egypt',
  'Morocco',
  'Kenya',
  'Ghana',
  'Ethiopia',
  'Tanzania',
  'Uganda',
];

export const SAMPLE_DEPARTMENTS = [
  'Engineering',
  'Product',
  'Design',
  'Marketing',
  'Sales',
  'HR',
  'Finance',
  'Operations',
  'Customer Success',
  'Business Development',
  'Legal',
  'IT',
  'Research & Development',
  'Quality Assurance',
  'Data Science',
  'DevOps',
  'Security',
  'Content',
  'Community',
  'Partnerships',
];

export const SAMPLE_STATUSES = ['Active', 'Inactive', 'Pending', 'On Leave', 'Terminated'];

export const SAMPLE_SKILLS = [
  'React',
  'TypeScript',
  'Node.js',
  'Python',
  'Java',
  'C++',
  'JavaScript',
  'Vue.js',
  'Angular',
  'SQL',
  'MongoDB',
  'PostgreSQL',
  'AWS',
  'Docker',
  'Kubernetes',
  'GraphQL',
  'REST API',
  'Git',
  'Linux',
  'Agile',
  'Scrum',
];

export const SAMPLE_PRODUCTS = [
  'Wireless Headphones',
  'Smart Watch',
  'Laptop Stand',
  'USB-C Hub',
  'Bluetooth Speaker',
  'Phone Case',
  'Screen Protector',
  'Charging Cable',
  'Power Bank',
  'Webcam',
  'Mechanical Keyboard',
  'Gaming Mouse',
  'Monitor Stand',
  'Desk Lamp',
  'Ergonomic Chair',
  'Standing Desk',
  'Noise Cancelling Headphones',
  'Tablet',
  'E-reader',
  'Smart Home Hub',
  'Security Camera',
  'Smart Bulb',
  'Air Purifier',
  'Coffee Maker',
  'Blender',
  'Vacuum Cleaner',
  'Iron',
  'Hair Dryer',
  'Electric Toothbrush',
  'Fitness Tracker',
];

export const SAMPLE_CATEGORIES = [
  'Electronics',
  'Computers',
  'Audio',
  'Mobile',
  'Gaming',
  'Home & Garden',
  'Kitchen',
  'Health & Beauty',
  'Sports',
  'Books',
  'Clothing',
  'Shoes',
  'Jewelry',
  'Toys',
  'Automotive',
  'Tools',
  'Office',
  'Pet Supplies',
];

export const SAMPLE_MANUFACTURERS = [
  'Apple',
  'Samsung',
  'Sony',
  'Microsoft',
  'Google',
  'Amazon',
  'Dell',
  'HP',
  'Lenovo',
  'Asus',
  'Acer',
  'Logitech',
  'Bose',
  'JBL',
  'Philips',
  'LG',
  'Panasonic',
  'Canon',
  'Nikon',
  'GoPro',
  'Fitbit',
  'Garmin',
  'Nintendo',
  'PlayStation',
  'Xbox',
  'SteelSeries',
  'Razer',
  'Corsair',
  'HyperX',
  'Sennheiser',
];

export const SAMPLE_FEATURES = [
  'High Quality Materials',
  'Eco-Friendly',
  'Long-lasting Durability',
  'Easy to Use',
  'Modern Design',
  'Energy Efficient',
  'Lightweight',
  'Waterproof',
  'Warranty Included',
  'Fast Shipping',
  'Wireless',
  'Bluetooth',
  'USB-C',
  'Fast Charging',
  'Noise Cancelling',
  'Voice Control',
  'Smart Home Compatible',
  'Mobile App',
  'Cloud Sync',
  'Multi-device',
];

export const SAMPLE_REGIONS = [
  'North America',
  'South America',
  'Europe',
  'Asia Pacific',
  'Middle East',
  'Africa',
  'Australia',
  'Caribbean',
  'Central America',
  'Oceania',
];

export const SAMPLE_ADDRESSES = [
  '123 Main St',
  '456 Oak Ave',
  '789 Pine Rd',
  '321 Elm St',
  '654 Maple Dr',
  '987 Cedar Ln',
  '147 Birch Way',
  '258 Spruce St',
  '369 Willow Ave',
  '741 Poplar Rd',
  '852 Ash Dr',
  '963 Hickory Ln',
  '159 Cherry St',
  '357 Walnut Ave',
  '468 Chestnut Rd',
  '579 Sycamore Dr',
  '680 Dogwood Ln',
  '791 Magnolia St',
  '802 Redwood Ave',
  '913 Sequoia Rd',
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const getRandomElement = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

export const getRandomElements = <T>(array: T[], min: number = 1, max: number = 3): T[] => {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

export const getRandomNumber = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const getRandomFloat = (min: number, max: number, decimals: number = 2): number => {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
};

export const getRandomDate = (yearsBack: number = 5): string => {
  const now = new Date();
  const pastDate = new Date(now.getFullYear() - yearsBack, now.getMonth(), now.getDate());
  const randomTime = pastDate.getTime() + Math.random() * (now.getTime() - pastDate.getTime());
  return new Date(randomTime).toISOString().split('T')[0];
};

export const getRandomRecentDate = (daysBack: number = 30): string => {
  const now = new Date();
  const pastDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  const randomTime = pastDate.getTime() + Math.random() * (now.getTime() - pastDate.getTime());
  return new Date(randomTime).toISOString();
};

export const generateSKU = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// ============================================================================
// DATA GENERATION FUNCTIONS
// ============================================================================

export const generateUserData = (count: number = 1000): User[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: getRandomElement(SAMPLE_NAMES),
    email: getRandomElement(SAMPLE_EMAILS),
    username: getRandomElement(SAMPLE_USERNAMES),
    phone: getRandomElement(SAMPLE_PHONES),
    company: getRandomElement(SAMPLE_COMPANIES),
    jobTitle: getRandomElement(SAMPLE_JOB_TITLES),
    position: getRandomElement(SAMPLE_JOB_TITLES),
    city: getRandomElement(SAMPLE_CITIES),
    country: getRandomElement(SAMPLE_COUNTRIES),
    status: getRandomElement(SAMPLE_STATUSES),
    salary: getRandomNumber(30000, 150000).toString(),
    department: getRandomElement(SAMPLE_DEPARTMENTS),
    joinDate: getRandomDate(5),
    experience: getRandomNumber(0, 15),
    address: getRandomElement(SAMPLE_ADDRESSES),
    skills: getRandomElements(SAMPLE_SKILLS, 2, 5),
  }));
};

export const generateEmployeeData = (count: number = 50): Employee[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: getRandomElement(SAMPLE_NAMES),
    email: getRandomElement(SAMPLE_EMAILS),
    company: getRandomElement(SAMPLE_COMPANIES),
    position: getRandomElement(SAMPLE_JOB_TITLES),
    phone: getRandomElement(SAMPLE_PHONES),
    address: getRandomElement(SAMPLE_ADDRESSES),
    city: getRandomElement(SAMPLE_CITIES),
    country: getRandomElement(SAMPLE_COUNTRIES),
    salary: getRandomNumber(30000, 150000),
    status: getRandomElement(SAMPLE_STATUSES),
    joinDate: getRandomDate(5),
    performance: getRandomNumber(1, 5),
    skills: getRandomElements(SAMPLE_SKILLS, 2, 5),
    department: getRandomElement(SAMPLE_DEPARTMENTS),
  }));
};

export const generateEmployeeWithDetailsData = (count: number = 30): EmployeeWithDetails[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: getRandomElement(SAMPLE_NAMES),
    email: getRandomElement(SAMPLE_EMAILS),
    phone: getRandomElement(SAMPLE_PHONES),
    department: getRandomElement(SAMPLE_DEPARTMENTS),
    position: getRandomElement(SAMPLE_JOB_TITLES),
    salary: getRandomNumber(30000, 150000),
    startDate: getRandomDate(5),
    performance: getRandomNumber(1, 5),
    manager: getRandomElement(SAMPLE_NAMES),
    location: getRandomElement(SAMPLE_CITIES),
    skills: getRandomElements(SAMPLE_SKILLS, 2, 5),
  }));
};

export const generateLargeEmployeeData = (count: number): EmployeeData[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: getRandomElement(SAMPLE_NAMES),
    email: getRandomElement(SAMPLE_EMAILS),
    phone: getRandomElement(SAMPLE_PHONES),
    department: getRandomElement(SAMPLE_DEPARTMENTS),
    position: getRandomElement(SAMPLE_JOB_TITLES),
    salary: getRandomNumber(30000, 200000),
    startDate: getRandomDate(10),
    performance: getRandomNumber(1, 5),
    manager: getRandomElement(SAMPLE_NAMES),
    location: getRandomElement(SAMPLE_CITIES),
    country: getRandomElement(SAMPLE_COUNTRIES),
    skills: getRandomElements(SAMPLE_SKILLS, 2, 6),
    projects: getRandomNumber(1, 20),
    experience: getRandomNumber(0, 15),
    status: getRandomElement(SAMPLE_STATUSES),
    lastLogin: getRandomRecentDate(30),
  }));
};

export const generateSampleData = (count: number = 50): SampleData[] => {
  return Array.from({ length: count }, (_, index) => {
    const quantity = getRandomNumber(1, 100);
    const unitPrice = getRandomFloat(10, 1000, 2);
    const total = quantity * unitPrice;
    const discount = getRandomFloat(0, 20, 1);
    const finalAmount = total * (1 - discount / 100);

    return {
      id: index + 1,
      product: getRandomElement(SAMPLE_PRODUCTS),
      category: getRandomElement(SAMPLE_CATEGORIES),
      quantity,
      unitPrice,
      total,
      discount,
      finalAmount,
      status: getRandomElement(SAMPLE_STATUSES),
      region: getRandomElement(SAMPLE_COUNTRIES),
      salesRep: getRandomElement(SAMPLE_NAMES),
    };
  });
};

export const generateSalesData = (count: number = 25): SalesData[] => {
  return Array.from({ length: count }, (_, index) => {
    const q1Sales = getRandomNumber(10000, 100000);
    const q2Sales = getRandomNumber(10000, 100000);
    const q3Sales = getRandomNumber(10000, 100000);
    const q4Sales = getRandomNumber(10000, 100000);
    const totalSales = q1Sales + q2Sales + q3Sales + q4Sales;
    const profit = getRandomNumber(5000, 50000);
    const margin = Math.round((profit / totalSales) * 100);

    return {
      id: index + 1,
      product: getRandomElement(SAMPLE_PRODUCTS),
      category: getRandomElement(SAMPLE_CATEGORIES),
      q1Sales,
      q2Sales,
      q3Sales,
      q4Sales,
      totalSales,
      profit,
      margin,
      region: getRandomElement(SAMPLE_CITIES),
      salesRep: getRandomElement(SAMPLE_NAMES),
    };
  });
};

export const generateProductData = (count: number = 100): Product[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: getRandomElement(SAMPLE_PRODUCTS),
    category: getRandomElement(SAMPLE_CATEGORIES),
    price: getRandomFloat(10, 1000, 2).toString(),
    description: `High-quality ${getRandomElement(SAMPLE_PRODUCTS).toLowerCase()} with excellent features and modern design.`,
    features: getRandomElements(SAMPLE_FEATURES, 2, 5),
    status: getRandomElement(['In Stock', 'Out of Stock', 'Pre-order', 'Limited']),
    stock: getRandomNumber(0, 500),
    sku: generateSKU(),
    manufacturer: getRandomElement(SAMPLE_MANUFACTURERS),
    lastUpdated: getRandomRecentDate(30),
  }));
};

export const generateCompanyData = (count: number = 5): Company[] => {
  return Array.from({ length: count }, (_, index) => {
    const departments = generateDepartmentData(getRandomNumber(3, 6));
    return {
      id: index + 1,
      name: getRandomElement(SAMPLE_COMPANIES),
      industry: getRandomElement(['Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail', 'Education', 'Consulting', 'Media']),
      revenue: getRandomNumber(1000000, 100000000),
      employees: getRandomNumber(50, 5000),
      founded: getRandomNumber(1950, 2020),
      ceo: getRandomElement(SAMPLE_NAMES),
      headquarters: getRandomElement(SAMPLE_CITIES),
      departments,
    };
  });
};

export const generateDepartmentData = (count: number = 5): Department[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: getRandomElement(SAMPLE_DEPARTMENTS),
    manager: getRandomElement(SAMPLE_NAMES),
    employees: getRandomNumber(5, 100),
    budget: getRandomNumber(100000, 5000000),
    teams: generateTeamData(getRandomNumber(2, 4)),
  }));
};

export const generateTeamData = (count: number = 3): Team[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: `${getRandomElement(['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta'])} Team`,
    lead: getRandomElement(SAMPLE_NAMES),
    members: getRandomNumber(3, 15),
    projects: getRandomNumber(1, 8),
    status: getRandomElement(['Active', 'Inactive', 'Planning', 'On Hold']),
  }));
};

// ============================================================================
// ASYNC DATA GENERATION
// ============================================================================

export const generateDatasetAsync = async (count: number): Promise<EmployeeData[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const data = generateLargeEmployeeData(count);
      resolve(data);
    }, 100);
  });
};
