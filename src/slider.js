import { select } from 'd3-selection';
import 'd3-selection-multi';
import 'd3-transition';

export default class Slider {
  constructor(options) {
    this.all = [];
    this.current = [];
    this.pointer = 0;
    this.running = false;
    this.direction = 1;

    this.options = Object.assign({
      amount: 1,
      duration: 300,
      orientation: 'horizontal',
      remove: false,
      rotate: true
    }, options);

    this.build();
  }

  build() {
    this.outer = select(document.createElement('div'))
      .classed('scola slider', true)
      .styles({
        'height': '100%',
        'overflow': 'hidden',
        'position': 'absolute',
        'width': '100%'
      });
  }

  destroy() {
    this.outer.remove();
  }

  node() {
    return this.outer.node();
  }

  isRunning() {
    return this.running;
  }

  append(element) {
    if (this.running) {
      return this;
    }

    this.all.push(element);

    if (this.all.length <= this.options.amount) {
      this.current.push(element);
      this.outer.node().appendChild(element.node());
    }

    this
      .setDimensions(element)
      .setPosition(element, this.all.indexOf(element));

    return this;
  }

  prepend(element) {
    if (this.running) {
      return this;
    }

    this.all.unshift(element);

    if (this.all.length <= this.options.amount) {
      this.current.unshift(element);
      this.outer.node()
        .insertBefore(element.node(), this.outer.node().firstChild);
    } else {
      this.pointer += 1;
    }

    this
      .setDimensions(element)
      .setPosition(element, this.all.indexOf(element));

    return this;
  }

  forward() {
    if (this.running) {
      return this;
    }

    return this.slideForward(
      this.current,
      this.calculateForward()
    );
  }

  calculateForward() {
    const hasEnough = this.all.length >= 2 * this.options.amount;

    this.pointer += this.options.amount;

    if (this.pointer > this.all.length) {
      this.pointer -= this.all.length;
    }

    let elements = this.all.slice(
      this.pointer,
      this.pointer + this.options.amount
    );

    const shortage = this.options.amount - elements.length;

    if (shortage > 0) {
      if (this.options.rotate && hasEnough) {
        elements = elements.concat(
          this.all.slice(0, shortage)
        );
      } else {
        this.pointer -= shortage;
      }
    }

    return elements;
  }

  slideForward(current, elements) {
    if (elements.length === 0) {
      return this;
    }

    this.running = true;
    this.current = [];

    const name = this.getPositionName();
    const sizeName = this.getSizeName();

    let size = 0;
    let fromIndex = 0;
    let toIndex = 0;
    let numRunning = 0;

    current.forEach((element, index) => {
      if (elements.length - index <= 0) {
        this.current.push(element);
      }

      size = size || parseInt(element.outer.style(sizeName), 10);

      element.outer
        .transition()
        .duration(this.options.duration)
        .style(name, ((elements.length - index) * -size * this.direction) + 'px')
        .on('end', () => {
          if (this.current.indexOf(element) === -1) {
            element.outer.remove();
          }
        });
    });

    elements.forEach((element, index) => {
      this.current.push(element);

      size = size || parseInt(element.outer.style(sizeName), 10);
      fromIndex = index + this.options.amount;
      toIndex = elements.length - index - this.options.amount;
      numRunning += 1;

      this.outer.node().appendChild(element.node());

      element.outer
        .style(name, (fromIndex * size * this.direction) + 'px')
        .transition()
        .duration(this.options.duration)
        .style(name, (toIndex * -size * this.direction) + 'px')
        .on('end', () => {
          numRunning -= 1;
          this.running = numRunning > 0;
        });
    });

    return this;
  }

  backward() {
    if (this.running) {
      return this;
    }

    return this.slideBackward(
      this.current,
      this.calculateBackward()
    );
  }

  calculateBackward() {
    const hasEnough = this.all.length >= 2 * this.options.amount;

    this.pointer -= this.options.amount;
    let amount = this.options.amount;

    if (this.pointer < 0) {
      if (this.options.rotate && hasEnough) {
        this.pointer += this.all.length;
      } else {
        amount += this.pointer;
        this.pointer = 0;
      }
    }

    let elements = this.all.slice(
      this.pointer,
      this.pointer + amount
    );

    const shortage = this.options.amount - elements.length;

    if (shortage > 0 && this.options.rotate && hasEnough) {
      elements = elements.concat(
        this.all.slice(0, shortage)
      );
    }

    return elements;
  }

  slideBackward(current, elements) {
    if (elements.length === 0) {
      return this;
    }

    this.running = true;
    this.current = [];

    const name = this.getPositionName();
    const sizeName = this.getSizeName();

    let size = 0;
    let numRunning = 0;

    elements.forEach((element, index) => {
      this.current.push(element);
      this.outer.node().appendChild(element.node());

      size = size || parseInt(element.outer.style(sizeName), 10);
      numRunning += 1;

      element.outer
        .style(name, ((elements.length - index) * -size * this.direction) + 'px')
        .transition()
        .duration(this.options.duration)
        .style(name, (index * size * this.direction) + 'px')
        .on('end', () => {
          numRunning -= 1;
          this.running = numRunning > 0;
        });
    });

    current.forEach((element, index) => {
      if (elements.length + index < this.options.amount) {
        this.current.push(element);
      }

      size = size || parseInt(element.outer.style(sizeName), 10);

      element.outer
        .transition()
        .duration(this.options.duration)
        .style(name, ((elements.length + index) * size * this.direction) + 'px')
        .on('end', () => {
          if (this.current.indexOf(element) === -1) {
            element.outer.remove();

            if (this.options.remove) {
              this.all.splice(this.all.indexOf(element), 1);
              element.destroy();
            }
          }
        });
    });

    return this;
  }

  toward(target) {
    if (this.running) {
      return this;
    }

    const pointer = this.all.indexOf(target);

    if (pointer > this.pointer) {
      this.slideTowardForward(
        this.calculateTowardForward(pointer)
      );
    } else if (pointer < this.pointer) {
      this.slideTowardBackward(
        this.calculateTowardBackward(pointer)
      );
    }

    return this;
  }

  calculateTowardForward(pointer) {
    const elements = this.all.slice(
      this.pointer,
      pointer + this.options.amount
    );

    this.pointer = Math.min(
      this.all.length - this.options.amount,
      pointer
    );

    return elements;
  }

  slideTowardForward(elements) {
    if (elements.length === 0) {
      return this;
    }

    this.running = true;

    const current = this.current;
    const name = this.getPositionName();
    const sizeName = this.getSizeName();

    let size = 0;
    let toIndex = 0;
    let numRunning = 0;

    this.current = this.all.slice(
      this.pointer,
      this.pointer + this.options.amount
    );

    elements.forEach((element, index) => {
      size = size || parseInt(element.outer.style(sizeName), 10);
      toIndex = elements.length - index - this.options.amount;
      numRunning += 1;

      if (current.indexOf(element) === -1) {
        this.outer.node().appendChild(element.node());
        element.outer.style(name, (index * size * this.direction) + 'px');
      }

      element.outer
        .transition()
        .duration(this.options.duration)
        .style(name, (toIndex * -size * this.direction) + 'px')
        .on('end', () => {
          numRunning -= 1;
          this.running = numRunning > 0;

          if (this.current.indexOf(element) === -1) {
            element.outer.remove();
          }
        });
    });
  }

  calculateTowardBackward(pointer) {
    const elements = this.all.slice(
      pointer,
      this.pointer + this.options.amount
    );

    this.pointer = pointer;

    return elements;
  }

  slideTowardBackward(elements) {
    if (elements.length === 0) {
      return this;
    }

    this.running = true;

    const name = this.getPositionName();
    const sizeName = this.getSizeName();

    const current = this.current;

    this.current = elements.slice(
      0,
      this.options.amount
    );

    let size = 0;
    let fromIndex = 0;
    let numRunning = 0;

    elements.forEach((element, index) => {
      size = size || parseInt(element.outer.style(sizeName), 10);
      fromIndex = elements.length - index - this.options.amount;
      numRunning += 1;

      if (current.indexOf(element) === -1) {
        this.outer.node().appendChild(element.node());
        element.outer.style(name, (fromIndex * -size * this.direction) + 'px');
      }

      element.outer
        .transition()
        .duration(this.options.duration)
        .style(name, (index * size * this.direction) + 'px')
        .on('end', () => {
          numRunning -= 1;
          this.running = numRunning > 0;

          if (this.current.indexOf(element) === -1) {
            element.outer.remove();
          }
        });
    });
  }

  reset() {
    return this
      .resetAll()
      .resetCurrent();
  }

  resetAll() {
    this.all.forEach((element) => {
      this.setDimensions(element);
    });

    return this;
  }

  resetCurrent(pointer) {
    pointer = pointer || 0;

    this.current.forEach((element) => {
      element.outer.remove();
    });

    this.pointer = pointer;
    this.current = this.all.slice(
      this.pointer,
      this.pointer + this.options.amount
    );

    this.current.forEach((element, index) => {
      this.outer.node().appendChild(element.node());
      this.setPosition(element, index);
    });

    return this;
  }

  getPositionName() {
    return this.options.orientation === 'horizontal' ? 'left' : 'top';
  }

  getSizeName() {
    return this.options.orientation === 'horizontal' ? 'width' : 'height';
  }

  setDimensions(element) {
    const dimensions = {
      height: '100%',
      width: '100%'
    };

    const sizeName = this.getSizeName();
    dimensions[sizeName] = (1 / this.options.amount * 100) + '%';

    element.outer.styles(dimensions);
    return this;
  }

  setPosition(element, index) {
    const name = this.getPositionName();
    const sizeName = this.getSizeName();
    const size = parseInt(element.outer.style(sizeName), 10);

    element.outer.style(name, (index * size) + 'px');

    return this;
  }

  clearSlides(current) {
    if (this.running) {
      return this;
    }

    this.all.forEach((element) => {
      if (current !== false || this.current.indexOf(element) === -1) {
        element.destroy();
      }
    });

    this.all = [];
    this.current = current !== false ? [] : this.current;
    this.pointer = 0;
    this.running = false;

    return this;
  }
}
