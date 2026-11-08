# 🍳 ChefFlow-Engine

High-performance, production-ready culinary & recipe backend service powered by **Node.js**, **Express**, and **Mongoose (MongoDB)**.

---

## 🚀 Key Features

- **Robust Mongoose Schema**:
  - Sub-documents for `ingredients` (amount, unit, optional flag, chef notes) and `instructions` (step numbering, descriptions, timers, tips).
  - Built-in nutritional breakdown (calories, protein, carbohydrates, fat, fiber, sodium).
  - Automatic URL-safe slug generation with collision handling.
  - Automatic `totalTime` calculation (`prepTime` + `cookTime`).
  - Full-text MongoDB search indexes across title, description, cuisine, tags, and ingredients.
- **Strict Validation via express-validator & Zod**: Clean, fail-fast validation middleware enforcing required `title` and `ingredients` fields, preventing malformed payloads from touching MongoDB.
- **RESTful Endpoints**:
  - **Create Recipe**: `POST /api/recipes` protected with `express-validator` security checks, rate-limiting, authentication, and unique slug generation.
  - **Search & Filter**: `GET /api/recipes` with pagination, regex/text search, and multi-field filters (`cuisine`, `category`, `difficulty`, `dietaryInfo`, `maxTime`).
  - **Single Recipe Retrieval**: `GET /api/recipes/:idOrSlug` supports lookup by MongoDB ObjectId or human-readable slug.
  - **Dynamic Serving Scaling**: `POST /api/recipes/:id/scale` recalculates all ingredient proportions dynamically for target servings.
  - **Pantry Search**: `POST /api/recipes/search-by-ingredients` matches recipes against available kitchen ingredients.
  - **Update & Delete**: `PUT /api/recipes/:id` and `DELETE /api/recipes/:id`.
- **Security & Reliability**: Helmet headers, configurable CORS, IP rate-limiting, and centralized error handling for Mongoose validation/duplicate key errors.

---

## 🛠️ API Reference: Recipe Creation

### Endpoint
`POST /api/recipes`

### Headers
| Header | Value | Description |
|---|---|---|
| `Content-Type` | `application/json` | Required |
| `Authorization` | `Bearer <JWT_TOKEN>` | Required (User must have role `chef` or `admin` and `membershipStatus: 'active'`) |

### Access Control Requirements
- **Required Roles**: `chef`, `admin` (regular `user` accounts receive `403 Forbidden`).
- **Required Membership**: `active` (`inactive`, `expired`, or `suspended` accounts receive `403 Forbidden`). Admins bypass membership expiration checks.

### Request Body Example
```json
{
  "title": "Truffle & Wild Mushroom Risotto",
  "description": "A luxurious Northern Italian classic featuring slow-simmered Carnaroli rice, sautéed cremini and porcini mushrooms, finished with cold butter, Parmigiano-Reggiano, and white truffle oil.",
  "cuisine": "Italian",
  "category": "Dinner",
  "difficulty": "Medium",
  "prepTime": 15,
  "cookTime": 30,
  "servings": 4,
  "dietaryInfo": ["Vegetarian", "Gluten-Free"],
  "ingredients": [
    {
      "name": "Carnaroli or Arborio Rice",
      "amount": 300,
      "unit": "g",
      "notes": "Unrinsed for starch release"
    },
    {
      "name": "Wild Mushrooms (Porcini & Cremini)",
      "amount": 350,
      "unit": "g",
      "notes": "Cleaned and sliced"
    },
    {
      "name": "White Truffle Oil",
      "amount": 1,
      "unit": "tsp",
      "notes": "For finishing drizzle",
      "isOptional": true
    }
  ],
  "instructions": [
    {
      "step": 1,
      "title": "Sauté the Wild Mushrooms",
      "description": "Heat 1 tbsp olive oil in a wide skillet over medium-high heat. Add mushrooms and sauté until browned.",
      "timerMinutes": 6
    },
    {
      "step": 2,
      "title": "Toast the Rice",
      "description": "Stir in shallots and rice. Toast the rice grains for 2 minutes until outer edges turn translucent.",
      "timerMinutes": 2
    }
  ],
  "nutrition": {
    "calories": 420,
    "protein": 11,
    "carbohydrates": 58,
    "fat": 16,
    "fiber": 4,
    "sodium": 520
  },
  "tags": ["risotto", "italian", "truffle", "gourmet"],
  "imageUrl": "https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?auto=format&fit=crop&w=1200&q=80"
}
```

### Success Response (`201 Created`)
```json
{
  "success": true,
  "message": "Recipe created successfully",
  "data": {
    "_id": "673f8a9e1c2b3a4f5d6e7f80",
    "title": "Truffle & Wild Mushroom Risotto",
    "slug": "truffle-wild-mushroom-risotto",
    "description": "A luxurious Northern Italian classic...",
    "cuisine": "Italian",
    "category": "Dinner",
    "difficulty": "Medium",
    "prepTime": 15,
    "cookTime": 30,
    "totalTime": 45,
    "servings": 4,
    "dietaryInfo": ["Vegetarian", "Gluten-Free"],
    "ingredients": [ ... ],
    "instructions": [ ... ],
    "nutrition": { ... },
    "tags": ["risotto", "italian", "truffle", "gourmet"],
    "imageUrl": "https://images.unsplash.com/photo-1633964913295-ceb43826e7c9...",
    "status": "published",
    "ratings": {
      "average": 0,
      "count": 0
    },
    "likesCount": 0,
    "createdAt": "2026-11-08T14:35:00.000Z",
    "updatedAt": "2026-11-08T14:35:00.000Z"
  }
}
```

### Error Response (`400 Bad Request` - Validation Failure)
```json
{
  "success": false,
  "message": "Validation failed for recipe payload",
  "errors": [
    {
      "field": "title",
      "message": "Recipe title must be at least 3 characters"
    },
    {
      "field": "servings",
      "message": "Recipe must provide at least 1 serving"
    }
  ]
}
```

---

## 🏃 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/chefflow
CLIENT_URL=http://localhost:3000
JWT_SECRET=chefflow_super_secret_jwt_key_2026_dev
```

### 3. Run Development Server
```bash
npm run dev
# or
npm start
```

### 4. Seed Database (Optional)
```bash
npm run seed
```

### 5. Run Verification & Security Tests
```bash
npm test
# or individually:
node test/express-validator.test.js
node test/recipe.test.js
```
