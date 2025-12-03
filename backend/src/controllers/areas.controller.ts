import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { Area } from '../entities/Area';

export class AreasController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const areaRepository = AppDataSource.getRepository(Area);
      const areas = await areaRepository.find({
        relations: ['beds'],
        order: { name: 'ASC' },
      });

      res.json(areas);
    } catch (error) {
      console.error('Error al obtener áreas:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const areaRepository = AppDataSource.getRepository(Area);
      const area = await areaRepository.findOne({
        where: { id: parseInt(id) },
        relations: ['beds', 'beds.patient'],
      });

      if (!area) {
        res.status(404).json({ message: 'Área no encontrada' });
        return;
      }

      res.json(area);
    } catch (error) {
      console.error('Error al obtener área:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { name, description } = req.body;

      if (!name) {
        res.status(400).json({ message: 'El nombre del área es requerido' });
        return;
      }

      const areaRepository = AppDataSource.getRepository(Area);
      const area = new Area();
      area.name = name;
      area.description = description || '';
      area.isActive = true;

      await areaRepository.save(area);

      res.status(201).json({ message: 'Área creada exitosamente', area });
    } catch (error) {
      console.error('Error al crear área:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, description, isActive } = req.body;

      const areaRepository = AppDataSource.getRepository(Area);
      const area = await areaRepository.findOne({ where: { id: parseInt(id) } });

      if (!area) {
        res.status(404).json({ message: 'Área no encontrada' });
        return;
      }

      if (name) area.name = name;
      if (description !== undefined) area.description = description;
      if (isActive !== undefined) area.isActive = isActive;

      await areaRepository.save(area);

      res.json({ message: 'Área actualizada exitosamente', area });
    } catch (error) {
      console.error('Error al actualizar área:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const areaRepository = AppDataSource.getRepository(Area);

      const area = await areaRepository.findOne({
        where: { id: parseInt(id) },
        relations: ['beds'],
      });

      if (!area) {
        res.status(404).json({ message: 'Área no encontrada' });
        return;
      }

      if (area.beds && area.beds.length > 0) {
        res.status(400).json({ message: 'No se puede eliminar un área que tiene camas asignadas' });
        return;
      }

      await areaRepository.remove(area);

      res.json({ message: 'Área eliminada exitosamente' });
    } catch (error) {
      console.error('Error al eliminar área:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
}

