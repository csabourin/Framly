import { type Project, type InsertProject, type CustomClass, type InsertCustomClass, type Category, type InsertCategory } from "@shared/schema";
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // Projects
  createProject(project: InsertProject): Promise<Project>;
  getProject(id: string): Promise<Project | undefined>;
  updateProject(id: string, project: InsertProject): Promise<Project | undefined>;
  listProjects(): Promise<Project[]>;
  deleteProject(id: string): Promise<boolean>;
  
  // Custom Classes
  createCustomClass(customClass: InsertCustomClass): Promise<CustomClass>;
  getCustomClass(name: string): Promise<CustomClass | undefined>;
  updateCustomClass(name: string, customClass: InsertCustomClass): Promise<CustomClass | undefined>;
  listCustomClasses(): Promise<CustomClass[]>;
  deleteCustomClass(name: string): Promise<boolean>;
  
  // Categories
  createCategory(category: InsertCategory): Promise<Category>;
  getCategory(id: string): Promise<Category | undefined>;
  updateCategory(id: string, category: InsertCategory): Promise<Category | undefined>;
  listCategories(type?: string): Promise<Category[]>;
  deleteCategory(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private projects: Map<string, Project>;
  private customClasses: Map<string, CustomClass>;
  private categories: Map<string, Category>;

  constructor() {
    this.projects = new Map();
    this.customClasses = new Map();
    this.categories = new Map();
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = randomUUID();
    const project: Project = { 
      ...insertProject, 
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.projects.set(id, project);
    return project;
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async updateProject(id: string, insertProject: InsertProject): Promise<Project | undefined> {
    const existing = this.projects.get(id);
    if (!existing) return undefined;
    
    const updated: Project = {
      ...existing,
      ...insertProject,
      updatedAt: new Date()
    };
    this.projects.set(id, updated);
    return updated;
  }

  async listProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async deleteProject(id: string): Promise<boolean> {
    return this.projects.delete(id);
  }

  // Custom Classes Methods
  async createCustomClass(insertCustomClass: InsertCustomClass): Promise<CustomClass> {
    const id = randomUUID();
    const customClass: CustomClass = { 
      ...insertCustomClass, 
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.customClasses.set(customClass.name, customClass);
    return customClass;
  }

  async getCustomClass(name: string): Promise<CustomClass | undefined> {
    return this.customClasses.get(name);
  }

  async updateCustomClass(name: string, insertCustomClass: InsertCustomClass): Promise<CustomClass | undefined> {
    const existing = this.customClasses.get(name);
    if (!existing) return undefined;
    
    const updated: CustomClass = {
      ...existing,
      ...insertCustomClass,
      updatedAt: new Date()
    };
    
    // If name changed, update the map key
    if (insertCustomClass.name && insertCustomClass.name !== name) {
      this.customClasses.delete(name);
      this.customClasses.set(insertCustomClass.name, updated);
    } else {
      this.customClasses.set(name, updated);
    }
    
    return updated;
  }

  async listCustomClasses(): Promise<CustomClass[]> {
    return Array.from(this.customClasses.values());
  }

  async deleteCustomClass(name: string): Promise<boolean> {
    return this.customClasses.delete(name);
  }

  // Categories Methods
  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = randomUUID();
    const category: Category = { 
      ...insertCategory, 
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.categories.set(id, category);
    return category;
  }

  async getCategory(id: string): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async updateCategory(id: string, insertCategory: InsertCategory): Promise<Category | undefined> {
    const existing = this.categories.get(id);
    if (!existing) return undefined;
    
    const updated: Category = {
      ...existing,
      ...insertCategory,
      updatedAt: new Date()
    };
    this.categories.set(id, updated);
    return updated;
  }

  async listCategories(type?: string): Promise<Category[]> {
    const categories = Array.from(this.categories.values());
    if (type) {
      return categories.filter(cat => cat.type === type);
    }
    return categories;
  }

  async deleteCategory(id: string): Promise<boolean> {
    return this.categories.delete(id);
  }
}

import { db } from "./db";
import { eq } from "drizzle-orm";
import { projects, customClasses, categories } from "@shared/schema";

export class DatabaseStorage implements IStorage {
  // Projects Methods
  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db
      .insert(projects)
      .values(insertProject)
      .returning();
    return project;
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async updateProject(id: string, insertProject: InsertProject): Promise<Project | undefined> {
    const [project] = await db
      .update(projects)
      .set({ ...insertProject, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project || undefined;
  }

  async listProjects(): Promise<Project[]> {
    return await db.select().from(projects);
  }

  async deleteProject(id: string): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Custom Classes Methods
  async createCustomClass(insertCustomClass: InsertCustomClass): Promise<CustomClass> {
    const [customClass] = await db
      .insert(customClasses)
      .values(insertCustomClass)
      .returning();
    return customClass;
  }

  async getCustomClass(name: string): Promise<CustomClass | undefined> {
    const [customClass] = await db.select().from(customClasses).where(eq(customClasses.name, name));
    return customClass || undefined;
  }

  async updateCustomClass(name: string, insertCustomClass: InsertCustomClass): Promise<CustomClass | undefined> {
    const [customClass] = await db
      .update(customClasses)
      .set({ ...insertCustomClass, updatedAt: new Date() })
      .where(eq(customClasses.name, name))
      .returning();
    return customClass || undefined;
  }

  async listCustomClasses(): Promise<CustomClass[]> {
    return await db.select().from(customClasses);
  }

  async deleteCustomClass(name: string): Promise<boolean> {
    const result = await db.delete(customClasses).where(eq(customClasses.name, name));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Categories Methods
  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await db
      .insert(categories)
      .values(insertCategory)
      .returning();
    return category;
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  async updateCategory(id: string, insertCategory: InsertCategory): Promise<Category | undefined> {
    const [category] = await db
      .update(categories)
      .set({ ...insertCategory, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    return category || undefined;
  }

  async listCategories(type?: string): Promise<Category[]> {
    if (type) {
      return await db.select().from(categories).where(eq(categories.type, type));
    }
    return await db.select().from(categories);
  }

  async deleteCategory(id: string): Promise<boolean> {
    const result = await db.delete(categories).where(eq(categories.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
}

export const storage = new MemStorage();
