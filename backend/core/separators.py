import trimesh

def separate_jewelry_components(mesh: trimesh.Trimesh):
    """
    Разделяет ювелирный меш на металл и камни на основе графа связности.
    Если компонент занимает < 15% объема максимального компонента — это камень.
    Возвращает: (metal_mesh, list_of_stone_meshes)
    """
    components = mesh.split(only_watertight=False)
    
    if len(components) <= 1:
        return mesh, []
        
    volumes = []
    for comp in components:
        # Для открытых мешей объем может быть 0, используем convex_hull как фоллбэк
        try:
            vol = comp.volume
            if vol <= 0:
                vol = comp.convex_hull.volume
        except Exception:
            vol = comp.convex_hull.volume
        volumes.append(vol)
        
    max_vol = max(volumes)
    threshold = max_vol * 0.15
    
    metal_components = []
    stone_components = []
    
    for comp, vol in zip(components, volumes):
        if vol >= threshold:
            metal_components.append(comp)
        else:
            stone_components.append(comp)
            
    if not metal_components:
        return mesh, []
        
    # Собираем все "крупные" куски обратно в единую металлическую основу
    metal_mesh = trimesh.util.concatenate(metal_components)
    
    return metal_mesh, stone_components
