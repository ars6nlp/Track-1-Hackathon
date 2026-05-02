import trimesh
import numpy as np

class MCPAnalyzer:
    @staticmethod
    def analyze(mesh: trimesh.Trimesh) -> dict:
        """
        Анализирует меш, рассчитывает дисперсию нормалей 
        и возвращает словарь параметров для сглаживания.
        """
        # Если нормали не рассчитаны, пытаемся их сгенерировать
        if not hasattr(mesh, 'vertex_normals') or mesh.vertex_normals is None or len(mesh.vertex_normals) == 0:
            try:
                mesh.compute_vertex_normals()
            except Exception:
                pass
                
        variance = 0.0
        if hasattr(mesh, 'vertex_normals') and mesh.vertex_normals is not None and len(mesh.vertex_normals) > 0:
            # Сэмплируем нормали, чтобы не грузить RAM на мешах 10M+ полигонов
            sample_size = min(10000, len(mesh.vertex_normals))
            indices = np.random.choice(len(mesh.vertex_normals), sample_size, replace=False)
            sampled_normals = mesh.vertex_normals[indices]
            # Дисперсия нормалей показывает, насколько "рваная" поверхность
            variance = float(np.var(sampled_normals, axis=0).mean())
            
        is_watertight = mesh.is_watertight
        # Простая эвристика для оценки количества дыр
        holes_proxy = len(mesh.faces) - len(mesh.edges_unique)
        
        # Подбор параметров на основе дисперсии
        if variance > 0.5:
            iterations = 3
            noise_threshold = 0.8
        elif variance > 0.2:
            iterations = 2
            noise_threshold = 0.5
        else:
            iterations = 1
            noise_threshold = 0.2
            
        return {
            "noise_variance": variance,
            "is_watertight": bool(is_watertight),
            "holes_proxy": holes_proxy,
            "bilateral_iterations": iterations,
            "noise_threshold": noise_threshold
        }
