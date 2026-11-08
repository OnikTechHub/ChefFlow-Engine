export const sampleRecipes = [
  {
    title: 'Truffle & Wild Mushroom Risotto',
    description:
      'A luxurious Northern Italian classic featuring slow-simmered Carnaroli rice, sautéed cremini and porcini mushrooms, finished with cold butter, Parmigiano-Reggiano, and white truffle oil.',
    cuisine: 'Italian',
    category: 'Dinner',
    difficulty: 'Medium',
    prepTime: 15,
    cookTime: 30,
    servings: 4,
    dietaryInfo: ['Vegetarian', 'Gluten-Free'],
    ingredients: [
      { name: 'Carnaroli or Arborio Rice', amount: 300, unit: 'g', notes: 'Unrinsed for starch release' },
      { name: 'Vegetable or Chicken Broth', amount: 1000, unit: 'ml', notes: 'Kept hot at a gentle simmer' },
      { name: 'Wild Mushrooms (Porcini & Cremini)', amount: 350, unit: 'g', notes: 'Cleaned and sliced' },
      { name: 'Shallot', amount: 2, unit: 'piece', notes: 'Finely minced' },
      { name: 'Garlic Cloves', amount: 3, unit: 'piece', notes: 'Minced' },
      { name: 'Dry White Wine', amount: 120, unit: 'ml', notes: 'Pinot Grigio or Sauvignon Blanc' },
      { name: 'Parmigiano-Reggiano', amount: 60, unit: 'g', notes: 'Freshly grated' },
      { name: 'Unsalted Butter', amount: 45, unit: 'g', notes: 'Cold and cubed' },
      { name: 'Extra Virgin Olive Oil', amount: 2, unit: 'tbsp' },
      { name: 'White Truffle Oil', amount: 1, unit: 'tsp', notes: 'For finishing drizzle' },
      { name: 'Fresh Thyme Leaves', amount: 1, unit: 'tbsp' },
      { name: 'Sea Salt & Freshly Cracked Black Pepper', amount: 1, unit: 'pinch', notes: 'To taste' },
    ],
    instructions: [
      {
        step: 1,
        title: 'Sauté the Wild Mushrooms',
        description:
          'Heat 1 tbsp olive oil in a wide heavy skillet over medium-high heat. Add sliced mushrooms and sauté until browned and tender, about 6 minutes. Season with salt and pepper, transfer to a plate.',
        timerMinutes: 6,
      },
      {
        step: 2,
        title: 'Toast the Rice (Tostatura)',
        description:
          'In the same pan, heat remaining olive oil over medium heat. Add minced shallots and cook until translucent. Stir in garlic and rice. Toast the rice grains for 2 minutes until outer edges turn translucent.',
        timerMinutes: 2,
      },
      {
        step: 3,
        title: 'Deglaze with Wine',
        description:
          'Pour in dry white wine. Stir constantly until wine is almost completely absorbed by the rice.',
        timerMinutes: 2,
      },
      {
        step: 4,
        title: 'Simmer and Add Broth Gradually',
        description:
          'Add hot broth one ladleful at a time, stirring steadily. Allow each ladle to be absorbed before adding the next. Continue for 18–20 minutes until rice is al dente and creamy.',
        timerMinutes: 20,
      },
      {
        step: 5,
        title: 'Mantecatura & Plating',
        description:
          'Remove from heat. Fold in sautéed mushrooms, cold butter cubes, grated Parmigiano-Reggiano, and fresh thyme. Vigorously stir to emulsify. Drizzle with truffle oil and serve immediately.',
        timerMinutes: 2,
      },
    ],
    nutrition: {
      calories: 420,
      protein: 11,
      carbohydrates: 58,
      fat: 16,
      fiber: 4,
      sugar: 3,
      sodium: 520,
    },
    tags: ['risotto', 'italian', 'comfort-food', 'truffle', 'mushrooms', 'gourmet'],
    imageUrl: 'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?auto=format&fit=crop&w=1200&q=80',
    status: 'published',
    ratings: { average: 4.9, count: 28 },
    likesCount: 142,
    isFeatured: true,
  },
  {
    title: 'Authentic Thai Basil Chicken (Pad Krapow Gai)',
    description:
      'A fiery and fragrant Thai street food favorite made with ground chicken, bird’s eye chilies, garlic, and fresh holy basil, coated in a savory soy-oyster sauce glaze.',
    cuisine: 'Thai',
    category: 'Dinner',
    difficulty: 'Easy',
    prepTime: 10,
    cookTime: 10,
    servings: 2,
    dietaryInfo: ['Dairy-Free', 'Halal'],
    ingredients: [
      { name: 'Ground Chicken (or coarsely minced thigh)', amount: 400, unit: 'g' },
      { name: 'Thai Holy Basil (or Italian Sweet Basil)', amount: 1.5, unit: 'cup', notes: 'Packed leaves' },
      { name: 'Thai Bird’s Eye Chilies', amount: 5, unit: 'piece', notes: 'Bruised or finely sliced' },
      { name: 'Garlic Cloves', amount: 6, unit: 'piece', notes: 'Pounded in a mortar' },
      { name: 'Oyster Sauce', amount: 1.5, unit: 'tbsp' },
      { name: 'Fish Sauce', amount: 1, unit: 'tbsp' },
      { name: 'Dark Sweet Soy Sauce', amount: 1, unit: 'tsp' },
      { name: 'Cane Sugar', amount: 1, unit: 'tsp' },
      { name: 'Cooking Oil', amount: 2, unit: 'tbsp' },
      { name: 'Eggs', amount: 2, unit: 'piece', notes: 'For crispy fried egg topping (Kai Dao)' },
    ],
    instructions: [
      {
        step: 1,
        title: 'Pound Aromatics',
        description:
          'In a mortar and pestle, coarsely pound garlic and bird’s eye chilies together into a rough paste.',
        timerMinutes: 3,
      },
      {
        step: 2,
        title: 'Fry the Crispy Eggs',
        description:
          'Heat generous oil in a wok until shimmering. Fry eggs until edges are golden and crispy while yolks remain runny. Set aside.',
        timerMinutes: 3,
      },
      {
        step: 3,
        title: 'Stir-Fry Chicken',
        description:
          'Heat 2 tbsp oil in the wok over high heat. Add pounded chili-garlic paste and stir-fry for 30 seconds until intensely aromatic. Add chicken, breaking into bite-sized bits until cooked through.',
        timerMinutes: 4,
      },
      {
        step: 4,
        title: 'Glaze and Toss Basil',
        description:
          'Stir in oyster sauce, fish sauce, dark soy sauce, and sugar. Toss rapidly on high heat. Turn off flame, immediately toss in holy basil until wilted from residual heat.',
        timerMinutes: 2,
      },
    ],
    nutrition: {
      calories: 380,
      protein: 36,
      carbohydrates: 9,
      fat: 22,
      fiber: 1,
      sugar: 4,
      sodium: 780,
    },
    tags: ['thai', 'streetfood', 'spicy', 'chicken', 'basil', 'quick-meals'],
    imageUrl: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=1200&q=80',
    status: 'published',
    ratings: { average: 4.8, count: 45 },
    likesCount: 198,
    isFeatured: true,
  },
];

