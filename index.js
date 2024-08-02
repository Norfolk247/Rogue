$(document).ready(function () {
    class Entity {
        // mode - режим ходьбы 0 - по одной оси и направление [0,1] ; 1 - случайное движение [1] ; 2 - в сторону игрока [2]
        constructor(hp, baseDamage, mode, name = 'tileE') {
            this.x = null
            this.y = null
            this.totalHp = hp
            this._hp = hp
            this._damage = baseDamage
            this.name = name
            this.mode = mode
        }
        set hp(dhp) {
            this._hp = Math.max(Math.min(this._hp + dhp, this.totalHp), 0)
        }
        set damage(ddamage) {
            this._damage += ddamage
        }
    }
    class Player extends Entity {
        constructor(hp, baseDamage) {
            super(hp, baseDamage, undefined, 'tileP')
            this.inventory = []
        }
        pickUp(item) {
            if (item instanceof Sword) {
                this.inventory.push(item)
                this.damage = item.damageBonus
                return
            }
            if (item instanceof Potion) {
                this.hp = item.heal
                return
            }
        }
        drop(index) {
            const droppedItem = this.inventory[index]
            this.inventory.splice(index, 1)
            if (droppedItem instanceof Sword) this.damage(-droppedItem.damageBonus)
            return droppedItem
        }
    }
    class Item {
        constructor(name) {
            this.name = name
        }
    }
    class Potion extends Item {
        constructor(heal) {
            super('tileHP')
            this.heal = heal
        }
    }
    class Sword extends Item {
        constructor(damageBonus) {
            super('tileSW')
            this.damageBonus = damageBonus
        }
    }
    class Game {
        constructor() {
            this.mapX = 40
            this.mapY = 24
            this.fieldSizeX = $('.field').width()
            this.fieldSizeY = $('.field').height()
            this.cellHeight = this.fieldSizeY / this.mapY
            this.cellWidth = this.fieldSizeX / this.mapX
            // wall true - стена false - пол
            this.map = Array(this.mapY).fill().map(() => Array(this.mapX).fill().map(() => ({
                wall: true,
                // null | [item,enemy] | enemy | player | item
                contains: null
            })))
            this.entities = []
            this.player = null
        }
        // функция отрисовки изображения
        render() {
            // очистка
            $('.field').empty()
            // заполнение
            for (const y in this.map) {
                for (const x in this.map[y]) {
                    const cell = this.map[y][x]

                    const offsetX = 100 / this.mapX * x
                    const offsetY = 100 / this.mapY * y

                    const elementStyle = `style="
                        width: ${this.cellWidth}px;
                        height: ${this.cellHeight}px;
                        left: ${offsetX}%; 
                        top: ${offsetY}%;
                    "`
                    let elementClass = `class="tile"`
                    if (cell.wall) elementClass = `class="tile tileW"`
                    if (cell.contains) elementClass = `class="tile ${cell.contains.name}"`

                    let hp = ``
                    if (cell.contains?._hp) hp = `<div class="health" style="width: ${cell.contains._hp * 100 / cell.contains.totalHp}%;"></div>`

                    const element = $(`<div 
                        ${elementClass} 
                        ${elementStyle}
                    >
                        ${hp}
                    </div>`)
                        .on('click', () => {
                            console.log(cell)
                        })

                    $('.field').append(element)
                }
            }
        }
        // выделение пространства
        pickPlace(x, y, sizeX, sizeY) {
            for (let i = x; i < x + sizeX; i++) {
                for (let j = y; j < y + sizeY; j++) {
                    this.map[j][i].wall = false
                }
            }
        }
        // функция выбора координат из функции пикера 
        chooseCell(x_yPicker) {
            // все клетки удовлетворяющие условию
            const solutions = []
            for (let y = 0; y < this.mapY; y++) {
                for (let x = 0; x < this.mapX; x++) {
                    if (x_yPicker(x, y)) solutions.push([x, y])
                }
            }
            // если нет решений, то вернуть null, а если есть, то вернуть случайную клетку
            if (solutions.length === 0) return [null, null]
            return solutions[Math.floor(Math.random() * solutions.length)]
        }
        // функция генерации сущности
        generateItem(entity) {
            const [x, y] = this.chooseCell((x, y) => (this.map[y][x].wall === false) && (this.map[y][x].contains === null))
            if (x === null) return
            this.map[y][x].contains = entity
            if ((entity.x === null) & (entity.y === null)) {
                entity.x = x
                entity.y = y
            }
        }
        // функция генерации комнаты
        generateRoom(sizeX, sizeY) {
            // функция проверки может ли комната быть размещена
            const canBePlaced = (x, y) => {
                let hitTheWall = false
                for (let i = y - 1; i < y + sizeY + 2; i++) {
                    for (let j = x - 1; j < x + sizeX + 2; j++) {
                        // границы карты
                        if ((i > this.mapY) || (j > this.mapX)) return false
                        // касается пола
                        if (this.map[Math.max(Math.min(i, this.mapY - 1), 0)][Math.max(Math.min(j, this.mapX - 1), 0)].wall === false) hitTheWall = true
                        /*// задевает другую комнату
                        if (this.map[i] ? this.map[i][j]?.wall === false : false) return false*/

                    }
                }
                return hitTheWall
            }
            const [x, y] = this.chooseCell(canBePlaced)
            if (x === null) return
            this.pickPlace(x, y, sizeX, sizeY)
        }
        // функция генерации прохода
        generateRoad(min = 1, max = 1, vertical = true) {
            let numbers = []
            if (vertical) {
                for (let i = 0; i < this.mapX; i++) numbers.push(i)
            } else {
                for (let i = 0; i < this.mapY; i++) numbers.push(i)
            }
            for (let i = 0; i < Math.floor(Math.random() * (max - min + 2)) + min; i++) {
                let index = Math.floor(Math.random() * numbers.length)
                vertical ? this.pickPlace(numbers[index], 0, 1, this.mapY) : this.pickPlace(0, numbers[index], this.mapX, 1)
                if (numbers[index - 1] === numbers[index] - 1) {
                    numbers.splice(index - 1, 1)
                    index--
                }
                if (numbers[index + 1] === numbers[index] + 1) {
                    numbers.splice(index + 1, 1)
                    index++
                }
                numbers = [...numbers.slice(0, index), ...numbers.slice(index + 1)]
            }
        }
        // функция перемещения
        move(entity, dx, dy) {
            this.map[entity.y][entity.x].contains = null
            this.map[entity.y + dy][entity.x + dx].contains = entity
            entity.x += dx
            entity.y += dy
        }
        movePlayer(dx, dy) {
            // 0 <= x < mapX & 0 <= y < mapY & xy != wall & xy != entity
            // если не в границах
            if (!(this.player.x + dx >= 0) || !(this.player.x + dx < this.mapX) || !(this.player.y + dy < this.mapY) || !(this.player.y + dy >= 0)) return
            // если стена
            if (this.map[this.player.y + dy][this.player.x + dx].wall) return
            // если entity | [item, entity]
            if ((this.map[this.player.y + dy][this.player.x + dx].contains instanceof Entity) || (this.map[this.player.y + dy][this.player.x + dx].contains instanceof Array)) return
            // если подобрал предмет
            if (this.map[this.player.y + dy][this.player.x + dx].contains instanceof Item) {
                this.player.pickUp(this.map[this.player.y + dy][this.player.x + dx].contains)
            }
            this.move(this.player, dx, dy)
        }
        moveEnemy(entity) {
            const x = entity.x
            const y = entity.y
            // атака героя true - противник ударил false - не ударил
            const damagePlayer = (cell) => {
                if (cell.contains instanceof Player) {
                    if (cell.contains._hp <= entity._damage) {
                        this.player = null
                        cell.contains = null
                        return true
                    }
                    cell.contains.hp = -entity._damage
                    return true
                }
                return false
            }
            // слева
            if (damagePlayer(this.map[y][Math.max(x - 1, 0)])) return
            // справа
            if (damagePlayer(this.map[y][Math.min(x + 1, this.mapX - 1)])) return
            // сверху
            if (damagePlayer(this.map[Math.max(y - 1, 0)][x])) return
            // снизу
            if (damagePlayer(this.map[Math.min(y + 1, this.mapY - 1)][x])) return
            // передвижение
            switch (entity.mode[0]) {
                // движение по одной оси
                case 0: {
                    // если слева и справа стены и режим 1 или 3
                    if (this.map[y][Math.max(x - 1, 0)].wall && this.map[y][Math.min(x + 1, this.mapX - 1)].wall && ((entity.mode[1] === 1) || (entity.mode[1] === 3))) entity.mode[1] = 0
                    // если сверху и снизу стены и режим 0 или 2
                    if (this.map[Math.max(y - 1, 0)][x].wall && this.map[Math.min(y + 1, this.mapY - 1)][x].wall && ((entity.mode[1] === 0) || (entity.mode[1] === 2))) entity.mode[1] = 1
                    // если движение вправо
                    if (entity.mode[1] === 1) {
                        // есть граница или стена
                        if (!(x + 1 < this.mapX) || (this.map[y][Math.min(x + 1, this.mapX - 1)].wall)) {
                            entity.mode[1] = 3
                            this.move(entity, -1, 0)
                            return
                        }
                        this.move(entity, 1, 0)
                        return
                    }
                    // если движение влево
                    if (entity.mode[1] === 3) {
                        // есть граница или стена
                        if (!(x - 1 >= 0) || (this.map[y][Math.max(x - 1, 0)].wall)) {
                            entity.mode[1] = 1
                            this.move(entity, 1, 0)
                            return
                        }
                        this.move(entity, -1, 0)
                        return
                    }
                    // если движение вверх
                    if (entity.mode[1] === 0) {
                        // есть граница или стена
                        if (!(y - 1 >= 0) || (this.map[Math.max(y - 1, 0)][x].wall)) {
                            entity.mode[1] = 2
                            this.move(entity, 0, 1)
                            return
                        }
                        this.move(entity, 0, -1)
                        return
                    }
                    // если движение вниз
                    if (entity.mode[1] === 2) {
                        // есть граница или стена
                        if (!(y + 1 < this.mapY) || (this.map[Math.min(y + 1, this.mapY - 1)][x].wall)) {
                            entity.mode[1] = 0
                            this.move(entity, 0, -1)
                            return
                        }
                        this.move(entity, 0, 1)
                        return
                    }
                }
                // случайное движение каждый ход
                case 1: {
                    const noWalls = []
                    // сверху
                    if ((y - 1 >= 0) && (!this.map[Math.max(y - 1, 0)][x].wall)) noWalls.push(0)
                    // снизу
                    if ((y + 1 < this.mapY) && (!this.map[Math.min(y + 1, this.mapY - 1)][x].wall)) noWalls.push(2)
                    // слева
                    if ((x - 1 >= 0) && (!this.map[y][Math.max(x - 1, 0)].wall)) noWalls.push(3)
                    // справа
                    if ((x + 1 < this.mapX) && (!this.map[y][Math.min(x + 1, this.mapX - 1)].wall)) noWalls.push(1)
                    switch (noWalls[Math.floor(Math.random() * noWalls.length)]) {
                        case 0: {
                            this.move(entity, 0, -1)
                            return
                        }
                        case 1: {
                            this.move(entity, 1, 0)
                            return
                        }
                        case 2: {
                            this.move(entity, 0, 1)
                            return
                        }
                        case 3: {
                            this.move(entity, -1, 0)
                            return
                        }
                    }
                }
                // в сторону игрока
                case 2: {
                    // по y
                    if (!this.player) return
                    if ((y !== this.player.y)&&(!this.map[y+Math.sign(this.player.y-y)][x].wall)) {
                        this.move(entity, 0, Math.sign(this.player.y-y))
                        return
                    }
                    // по x
                    if ((x !== this.player.x)&&(!this.map[y][x+Math.sign(this.player.x-x)].wall)) {
                        this.move(entity, Math.sign(this.player.x-x), 0)
                        return
                    }
                }
            }
        }
        attackPlayer() {
            const x = this.player.x
            const y = this.player.y
            const damageEntity = (cell) => {
                if (cell.contains instanceof Entity) {
                    if (cell.contains._hp <= this.player._damage) {
                        this.entities = this.entities.filter(entity => entity !== cell.contains)
                        cell.contains = null
                        return
                    }
                    cell.contains.hp = -this.player._damage
                }
            }
            // слева
            damageEntity(this.map[y][Math.max(x - 1, 0)])
            // справа
            damageEntity(this.map[y][Math.min(x + 1, this.mapX - 1)])
            // сверху
            damageEntity(this.map[Math.max(y - 1, 0)][x])
            // снизу
            damageEntity(this.map[Math.min(y + 1, this.mapY - 1)][x])
        }
        addKeyBinds() {
            $(document).on('keydown', event => {
                if (!['w', 'a', 's', 'd', ' '].includes(event.key)) return
                if (event.key === 'w') this.movePlayer(0, -1)
                if (event.key === 'a') this.movePlayer(-1, 0)
                if (event.key === 's') this.movePlayer(0, 1)
                if (event.key === 'd') this.movePlayer(1, 0)
                if (event.key === ' ') {
                    event.preventDefault()
                    this.attackPlayer()
                }
                for (let entity of this.entities) {
                    this.moveEnemy(entity)
                }
                this.render()
            })
        }
        init() {
            // генерация вертикальных проходов (3-5)
            this.generateRoad(3, 5)
            // генерация горизонтальных проходов (3-5)
            this.generateRoad(3, 5, false)
            // генерация комнат (5-10)
            for (let i = 0; i < Math.floor(Math.random() * 7) + 5; i++) {
                // случайный размер (3-8)
                this.generateRoom(Math.floor(Math.random() * 7) + 3, Math.floor(Math.random() * 7) + 3)
            }
            // генерация мечей (2 с доп уроном 1)
            for (let i = 0; i < 2; i++) {
                this.generateItem(new Sword(1))
            }
            // генерация зелий (10 с хилом 2)
            for (let i = 0; i < 10; i++) {
                this.generateItem(new Potion(2))
            }
            // генерация героя 10 хп и базовой атакой 1
            this.player = new Player(10, 1)
            this.generateItem(this.player)
            // генерация противников (10) с 5 хп, базовой атакой 1 и режимом ходьбы 2
            for (let i = 0; i < 10; i++) {
                const entity = new Entity(5, 1, [2])
                this.generateItem(entity)
                this.entities.push(entity)
            }
            this.render()
            // добавить привязку клавиш
            this.addKeyBinds()
        }
    }

    const game = new Game()
    game.init()
})