// Additionals configuration for drinks and other items
// Structure: { tag: { label, options: [{ key, label, choices: [{ key, label }] }] } }

const ADDITIONALS = {
  drinks: {
    label: "Drinks",
    options: [
      {
        key: "cupsize",
        label: "Ukuran Gelas",
        choices: [
          { key: "small", label: "Small", price: 0 },
          { key: "medium", label: "Medium", price: 0 },
          { key: "large", label: "Large", price: 0 },
        ],
      },
      {
        key: "sugar",
        label: "Gula",
        choices: [
          { key: "less", label: "Less Sugar", price: 0 },
          { key: "normal", label: "Normal", price: 0 },
          { key: "more", label: "More Sugar", price: 0 },
        ],
      },
      {
        key: "temperature",
        label: "Panas/Dingin",
        choices: [
          {
            key: "ice",
            label: "Ice",
            subOptions: [
              { key: "less", label: "Less Ice", price: 0 },
              { key: "normal", label: "Normal Ice", price: 0 },
              { key: "more", label: "More Ice", price: 0 },
            ],
          },
          { key: "hot", label: "Hot", price: 0, subOptions: [] },
        ],
      },
    ],
  },
};

export { ADDITIONALS };
