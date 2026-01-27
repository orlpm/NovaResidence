-- Script para agregar datos de prueba para el portal de residentes
-- Este script crea un condominio, edificio, unidad y asigna a Clara Tur como residente

-- Insertar un condominio de prueba
DECLARE @condominiumId UNIQUEIDENTIFIER = NEWID()
DECLARE @buildingId UNIQUEIDENTIFIER = NEWID()
DECLARE @unitId UNIQUEIDENTIFIER = NEWID()
DECLARE @userId UNIQUEIDENTIFIER

-- Obtener el ID del usuario Clara Tur
SELECT @userId = Id FROM [auth].[Users] WHERE Email = 'clara@gmail.com'

-- Si Clara no existe, mostrar mensaje de error
IF @userId IS NULL
BEGIN
    PRINT 'Error: Usuario Clara Tur no encontrado en la base de datos'
    RETURN
END

PRINT 'Usuario Clara Tur encontrado con ID: ' + CAST(@userId AS VARCHAR(36))

-- Verificar si ya existe un condominio de prueba
IF NOT EXISTS (SELECT 1 FROM [condo].[Condominiums] WHERE Name = 'Condominio Demo')
BEGIN
    -- Insertar condominio
    INSERT INTO [condo].[Condominiums] (Id, Name, Address, TotalUnits, LegalRepresentative, Rfc, CreatedAt, IsDeleted)
    VALUES (@condominiumId, 'Condominio Demo', 'Av. Principal 123, Ciudad', 50, 'Juan Pérez', 'XAXX010101000', GETUTCDATE(), 0)

    PRINT 'Condominio creado con ID: ' + CAST(@condominiumId AS VARCHAR(36))
END
ELSE
BEGIN
    -- Si ya existe, obtener su ID
    SELECT @condominiumId = Id FROM [condo].[Condominiums] WHERE Name = 'Condominio Demo'
    PRINT 'Usando condominio existente con ID: ' + CAST(@condominiumId AS VARCHAR(36))
END

-- Verificar si ya existe un edificio de prueba
IF NOT EXISTS (SELECT 1 FROM [condo].[Buildings] WHERE Name = 'Torre A' AND CondominiumId = @condominiumId)
BEGIN
    -- Insertar edificio
    INSERT INTO [condo].[Buildings] (Id, CondominiumId, Name, Floors, UnitsPerFloor, CreatedAt, IsDeleted)
    VALUES (@buildingId, @condominiumId, 'Torre A', 10, 5, GETUTCDATE(), 0)

    PRINT 'Edificio creado con ID: ' + CAST(@buildingId AS VARCHAR(36))
END
ELSE
BEGIN
    -- Si ya existe, obtener su ID
    SELECT @buildingId = Id FROM [condo].[Buildings] WHERE Name = 'Torre A' AND CondominiumId = @condominiumId
    PRINT 'Usando edificio existente con ID: ' + CAST(@buildingId AS VARCHAR(36))
END

-- Verificar si ya existe una unidad de prueba
IF NOT EXISTS (SELECT 1 FROM [condo].[Units] WHERE UnitNumber = '101' AND BuildingId = @buildingId)
BEGIN
    -- Insertar unidad
    INSERT INTO [condo].[Units] (
        Id, BuildingId, UnitNumber, Floor, Area, Bedrooms, Bathrooms, Status, 
        MonthlyMaintenanceFee, CreatedAt, IsDeleted
    )
    VALUES (
        @unitId, @buildingId, '101', 1, 85.5, 2, 2, 'Occupied', 
        2500.00, GETUTCDATE(), 0
    )

    PRINT 'Unidad creada con ID: ' + CAST(@unitId AS VARCHAR(36))
END
ELSE
BEGIN
    -- Si ya existe, obtener su ID
    SELECT @unitId = Id FROM [condo].[Units] WHERE UnitNumber = '101' AND BuildingId = @buildingId
    PRINT 'Usando unidad existente con ID: ' + CAST(@unitId AS VARCHAR(36))
END

-- Verificar si Clara ya es residente
IF NOT EXISTS (SELECT 1 FROM [condo].[Residents] WHERE UserId = @userId)
BEGIN
    -- Insertar registro de residente para Clara Tur
    INSERT INTO [condo].[Residents] (
        Id, UnitId, FirstName, LastName, Email, PhoneNumber, Type, 
        UserId, IsRegistered, IsActive, MoveInDate, RegisteredAt, CreatedAt, IsDeleted
    )
    VALUES (
        NEWID(), @unitId, 'Clara', 'Tur', 'clara@gmail.com', '555-0101', 1, -- Type 1 = Owner
        @userId, 1, 1, GETUTCDATE(), GETUTCDATE(), GETUTCDATE(), 0
    )

    PRINT 'Residente creado exitosamente para Clara Tur'
    PRINT 'Unidad asignada: 101 - Torre A'
END
ELSE
BEGIN
    PRINT 'Clara Tur ya está registrada como residente'
    
    -- Actualizar el unitId si es necesario
    UPDATE [condo].[Residents]
    SET UnitId = @unitId,
        IsActive = 1,
        IsRegistered = 1
    WHERE UserId = @userId
    
    PRINT 'Información de residente actualizada'
END

-- Verificar el resultado
SELECT 
    r.Id as ResidentId,
    r.FirstName + ' ' + r.LastName as Name,
    r.Email,
    u.UnitNumber,
    b.Name as Building,
    c.Name as Condominium,
    r.Type as ResidentType,
    r.IsRegistered,
    r.IsActive
FROM [condo].[Residents] r
INNER JOIN [condo].[Units] u ON r.UnitId = u.Id
INNER JOIN [condo].[Buildings] b ON u.BuildingId = b.Id
INNER JOIN [condo].[Condominiums] c ON b.CondominiumId = c.Id
WHERE r.UserId = @userId

PRINT 'Script completado exitosamente'
