import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertCustomClassSchema, insertCategorySchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Save project
  app.post("/api/projects", async (req, res) => {
    try {
      const data = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(data);
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid project data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to save project" });
      }
    }
  });

  // Load project
  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        res.status(404).json({ message: "Project not found" });
        return;
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to load project" });
    }
  });

  // Update project
  app.put("/api/projects/:id", async (req, res) => {
    try {
      const data = insertProjectSchema.parse(req.body);
      const project = await storage.updateProject(req.params.id, data);
      if (!project) {
        res.status(404).json({ message: "Project not found" });
        return;
      }
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid project data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update project" });
      }
    }
  });

  // List projects
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.listProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to list projects" });
    }
  });

  // Delete project
  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const success = await storage.deleteProject(req.params.id);
      if (!success) {
        res.status(404).json({ message: "Project not found" });
        return;
      }
      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // === Custom Classes API ===
  
  // Create custom class
  app.post("/api/classes", async (req, res) => {
    try {
      const data = insertCustomClassSchema.parse(req.body);
      const customClass = await storage.createCustomClass(data);
      res.json(customClass);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid class data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create custom class" });
      }
    }
  });

  // Get all custom classes
  app.get("/api/classes", async (req, res) => {
    try {
      const classes = await storage.listCustomClasses();
      res.json(classes);
    } catch (error) {
      res.status(500).json({ message: "Failed to load custom classes" });
    }
  });

  // Get custom class by name
  app.get("/api/classes/:name", async (req, res) => {
    try {
      const customClass = await storage.getCustomClass(req.params.name);
      if (!customClass) {
        res.status(404).json({ message: "Custom class not found" });
        return;
      }
      res.json(customClass);
    } catch (error) {
      res.status(500).json({ message: "Failed to load custom class" });
    }
  });

  // Update custom class
  app.put("/api/classes/:name", async (req, res) => {
    try {
      const data = insertCustomClassSchema.parse(req.body);
      const customClass = await storage.updateCustomClass(req.params.name, data);
      if (!customClass) {
        res.status(404).json({ message: "Custom class not found" });
        return;
      }
      res.json(customClass);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid class data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update custom class" });
      }
    }
  });

  // Delete custom class
  app.delete("/api/classes/:name", async (req, res) => {
    try {
      const success = await storage.deleteCustomClass(req.params.name);
      if (!success) {
        res.status(404).json({ message: "Custom class not found" });
        return;
      }
      res.json({ message: "Custom class deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete custom class" });
    }
  });

  // === Categories API ===
  
  // Create category
  app.post("/api/categories", async (req, res) => {
    try {
      const data = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(data);
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid category data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create category" });
      }
    }
  });

  // Get all categories
  app.get("/api/categories", async (req, res) => {
    try {
      const type = req.query.type as string;
      const categories = await storage.listCategories(type);
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to load categories" });
    }
  });

  // Update category
  app.put("/api/categories/:id", async (req, res) => {
    try {
      const data = insertCategorySchema.parse(req.body);
      const category = await storage.updateCategory(req.params.id, data);
      if (!category) {
        res.status(404).json({ message: "Category not found" });
        return;
      }
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid category data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update category" });
      }
    }
  });

  // Delete category
  app.delete("/api/categories/:id", async (req, res) => {
    try {
      const success = await storage.deleteCategory(req.params.id);
      if (!success) {
        res.status(404).json({ message: "Category not found" });
        return;
      }
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
