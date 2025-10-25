"use client";

import Card from "@/components/ui/Card";
import { motion } from "framer-motion";
import { ShoppingBag, Store, Shield } from "lucide-react";

export default function RoleSelector({ selectedRole, onSelectRole }) {
  const roles = [
    {
      id: "customer",
      title: "Customer",
      description: "Browse and shop from verified vendors",
      icon: ShoppingBag,
      color: "from-blue-500 to-blue-600",
    },
    {
      id: "vendor",
      title: "Vendor",
      description: "Sell your products and grow your business",
      icon: Store,
      color: "from-accent to-accent-dark",
    },
    {
      id: "admin",
      title: "Admin",
      description: "Manage platform and monitor activities",
      icon: Shield,
      color: "from-primary to-primary-dark",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-primary mb-2">
          Choose Your Role
        </h2>
        <p className="text-gray-600">Select how you want to use CarmelMart</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {roles.map((role, index) => {
          const Icon = role.icon;
          const isSelected = selectedRole === role.id;

          return (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                hover={true}
                className={`
                  cursor-pointer p-6 text-center transition-all duration-300
                  ${
                    isSelected
                      ? "ring-4 ring-primary shadow-xl scale-105"
                      : "hover:shadow-lg"
                  }
                `}
                onClick={() => onSelectRole(role.id)}
              >
                <motion.div
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                  className={`
                    w-20 h-20 mx-auto mb-4 rounded-2xl 
                    bg-linear-to-br ${role.color}
                    flex items-center justify-center
                    shadow-lg
                  `}
                >
                  <Icon className="w-10 h-10 text-white" />
                </motion.div>

                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {role.title}
                </h3>
                <p className="text-sm text-gray-600">{role.description}</p>

                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="mt-4 w-8 h-8 mx-auto bg-primary rounded-full flex items-center justify-center"
                  >
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </motion.div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
